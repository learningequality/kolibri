import { unzip, strFromU8, strToU8 } from 'fflate';
import isPlainObject from 'lodash/isPlainObject';
import loadBinary from './loadBinary';
import mimetypes from './mimetypes.json';
import { getAbsoluteFilePath, defaultFilePathMappers } from './fileUtils';

class ExtractedFile {
  constructor(name, obj) {
    this.name = name;
    this.obj = obj;
    this._url = null;
  }

  get fileNameExt() {
    return (this.name.split('.').slice(-1)[0] || '').toLowerCase();
  }

  get mimeType() {
    return mimetypes[this.fileNameExt] || '';
  }

  toString() {
    return strFromU8(this.obj);
  }

  toUrl() {
    if (!this._url) {
      const blob = new Blob([this.obj.buffer], { type: this.mimeType });
      this._url = URL.createObjectURL(blob);
    }
    return this._url;
  }

  close() {
    if (this._url) {
      URL.revokeObjectURL(this._url);
    }
  }
}

export default class ZipFile {
  constructor(url, { filePathMappers } = { filePathMappers: defaultFilePathMappers }) {
    this._loadingError = null;
    this._extractedFileCache = {};
    this._fileLoadingPromise = loadBinary(url)
      .then(data => {
        this.zipData = new Uint8Array(data);
      })
      .catch(err => {
        this._loadingError = err;
      });
    this.filePathMappers = isPlainObject(filePathMappers) ? filePathMappers : {};
  }

  /*
   * @param {ExtractedFile} file - The file to carry out replacement of references in
   * @param {Object} visitedPaths - A map of paths that have already been visited to prevent a loop
   * @return {Promise[ExtractedFile]} - A promise that resolves to the file with references replaced
   */
  _replaceFiles(file, visitedPaths) {
    const mapperClass = this.filePathMappers[file.fileNameExt];
    if (!mapperClass) {
      return Promise.resolve(file);
    }
    visitedPaths = { ...visitedPaths };
    visitedPaths[file.name] = true;
    const mapper = new mapperClass(file);
    // Filter out any paths that are in our already visited paths, as that means we are in a
    // referential loop where one file has pointed us to another, which is now point us back
    // to the source.
    // Because we need to modify the file before we generate the URL, we can't resolve this loop.
    const paths = mapper
      .getPaths()
      .filter(path => !visitedPaths[getAbsoluteFilePath(file.name, path)]);
    const absolutePathsMap = paths.reduce((acc, path) => {
      acc[getAbsoluteFilePath(file.name, path)] = path;
      return acc;
    }, {});
    return this._getFiles(file => absolutePathsMap[file.name], visitedPaths).then(
      replacementFiles => {
        const replacementFileMap = replacementFiles.reduce((acc, replacementFile) => {
          acc[absolutePathsMap[replacementFile.name]] = replacementFile.toUrl();
          return acc;
        }, {});
        const newFileContents = mapper.replacePaths(replacementFileMap);
        file.obj = strToU8(newFileContents);
        return file;
      },
    );
  }

  _getFiles(filterPredicate, visitedPaths = {}) {
    const filter = file => !this._extractedFileCache[file.name] && filterPredicate(file);
    return this._fileLoadingPromise.then(() => {
      return new Promise((resolve, reject) => {
        unzip(this.zipData, { filter }, (err, unzipped) => {
          if (err) {
            reject(err);
            return;
          }
          const alreadyUnzipped = Object.values(this._extractedFileCache).filter(filterPredicate);
          if (!unzipped && !alreadyUnzipped.length) {
            reject('No files found');
            return;
          }
          Promise.all(
            Object.entries(unzipped).map(([name, obj]) => {
              const extractedFile = new ExtractedFile(name, obj);
              return this._replaceFiles(extractedFile, visitedPaths).then(extractedFile => {
                this._extractedFileCache[name] = extractedFile;
                return extractedFile;
              });
            }),
          ).then(extractedFiles => {
            resolve(extractedFiles.concat(alreadyUnzipped));
          });
        });
      });
    });
  }

  file(filename) {
    if (this._loadingError) {
      return Promise.reject(this._loadingError);
    }
    if (this._extractedFileCache[filename]) {
      return Promise.resolve(this._extractedFileCache[filename]);
    }
    return this._getFiles(file => file.name === filename).then(files => files[0]);
  }
  files(path) {
    if (this._loadingError) {
      return Promise.reject(this._loadingError);
    }
    return this._getFiles(file => file.name.startsWith(path));
  }
  filesFromExtension(extension) {
    if (this._loadingError) {
      return Promise.reject(this._loadingError);
    }
    return this._getFiles(file => file.name.endsWith(extension));
  }
  close() {
    for (const file of Object.values(this._extractedFileCache)) {
      file.close();
    }
    this.zipData = null;
  }
}
