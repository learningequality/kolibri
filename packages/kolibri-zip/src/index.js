import { inflate, strFromU8, strToU8 } from 'fflate';
import isPlainObject from 'lodash/isPlainObject';
import mimetypes from './mimetypes.json';
import { getAbsoluteFilePath, defaultFilePathMappers } from './fileUtils';
import ZipMetadata from './zipMetadata';
import { LOCAL_FILE_HEADER_SIGNATURE, LOCAL_FILE_HEADER_FIXED_SIZE } from './constants';
import { readUInt16LE, readUInt32LE } from './zipUtils';

class ExtractedFile {
  constructor(name, obj, urlGenerator = null) {
    this.name = name;
    this.obj = obj;
    this._url = null;
    this._urlGenerator = urlGenerator;
  }

  get fileNameExt() {
    return (this.name.split('.').slice(-1)[0] || '').toLowerCase();
  }

  get mimeType() {
    return mimetypes[this.fileNameExt] || '';
  }

  toString() {
    if (this._urlGenerator) {
      throw new Error('Cannot convert large file to string');
    }
    return strFromU8(this.obj);
  }

  toUrl() {
    if (this._url) {
      return this._url;
    }
    if (this._urlGenerator) {
      this._url = this._urlGenerator(this.name);
    } else {
      const blob = new Blob([this.obj.buffer], { type: this.mimeType });
      this._url = URL.createObjectURL(blob);
    }
    return this._url;
  }

  close() {
    if (this._url && !this._urlGenerator) {
      URL.revokeObjectURL(this._url);
    }
  }
}

export default class ZipFile {
  constructor(
    url,
    { filePathMappers, largeFileThreshold, largeFileUrlGenerator } = {
      filePathMappers: defaultFilePathMappers,
      largeFileThreshold: 500 * 1024,
      largeFileUrlGenerator: null,
    },
  ) {
    this._loadingError = null;
    this._extractedFileCache = {};
    this._entriesMap = {};
    this._segmentInfo = {};
    this._segmentData = new Map();
    this._zipFileSize = null;
    this.largeFileUrlGenerator = largeFileUrlGenerator;
    this.filePathMappers = isPlainObject(filePathMappers) ? filePathMappers : {};
    this._metadata = new ZipMetadata(url, Object.keys(this.filePathMappers), largeFileThreshold);
    // Initialize metadata loading
    this._metadataPromise = this._metadata
      .readCentralDirectory()
      .then(({ entries, segments, totalSize }) => {
        this._entriesMap = entries;
        this._segmentInfo = segments;
        this._zipFileSize = totalSize;
      })
      .catch(err => {
        this._loadingError = err;
        throw err;
      });
  }

  async _loadSegment(segmentId) {
    if (this._segmentData.has(segmentId)) {
      return this._segmentData.get(segmentId);
    }

    const segment = this._segmentInfo[segmentId];
    if (!segment) {
      throw new Error(`Invalid segment ID: ${segmentId}`);
    }

    const segmentData = this._metadata.readRange(segment.start, segment.end - segment.start);
    this._segmentData.set(segmentId, segmentData);
    return segmentData;
  }

  async _replaceFiles(file, visitedPaths = {}) {
    const mapperClass = this.filePathMappers[file.fileNameExt];
    if (!mapperClass) {
      return file;
    }

    visitedPaths = { ...visitedPaths };
    visitedPaths[file.name] = true;

    const mapper = new mapperClass(file);
    const paths = mapper
      .getPaths()
      .filter(path => !visitedPaths[getAbsoluteFilePath(file.name, path)]);

    const absolutePathsMap = paths.reduce((acc, path) => {
      acc[getAbsoluteFilePath(file.name, path)] = path;
      return acc;
    }, {});

    const promises = Object.keys(absolutePathsMap).map(async absPath => {
      const entry = this._entriesMap[absPath];
      if (!entry) return null;
      return this._extractFile(entry, visitedPaths);
    });

    const replacementFiles = (await Promise.all(promises)).filter(Boolean);

    const replacementFileMap = replacementFiles.reduce((acc, replacementFile) => {
      acc[absolutePathsMap[replacementFile.name]] = replacementFile.toUrl();
      return acc;
    }, {});

    const newFileContents = mapper.replacePaths(replacementFileMap);
    file.obj = strToU8(newFileContents);

    return file;
  }

  async _extractFile(entry, visitedPaths = {}) {
    // Return cached file if available
    if (this._extractedFileCache[entry.fileName]) {
      return this._extractedFileCache[entry.fileName];
    }

    // For large files, create and cache a URL generator file
    if (entry.loadFromUrl) {
      const extractedFile = new ExtractedFile(entry.fileName, null, this.largeFileUrlGenerator);
      this._extractedFileCache[entry.fileName] = extractedFile;
      return extractedFile;
    }

    // Load the segment containing this file
    const segmentData = await this._loadSegment(entry.segment);

    // Calculate the file's offset within the segment
    const fileOffset = entry.localHeaderOffset - this._segmentInfo[entry.segment].start;

    // Verify local file header signature
    const signature = readUInt32LE(segmentData, fileOffset);
    if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
      throw new Error(`Invalid local file header signature for ${entry.fileName}`);
    }

    // Read variable-length fields from local header
    const fileNameLength = readUInt16LE(segmentData, fileOffset + 26);
    const extraFieldLength = readUInt16LE(segmentData, fileOffset + 28);

    // Calculate offset to compressed data
    const dataOffset =
      fileOffset + LOCAL_FILE_HEADER_FIXED_SIZE + fileNameLength + extraFieldLength;

    // Extract the compressed data from the segment
    const compressedData = segmentData.subarray(dataOffset, dataOffset + entry.compressedSize);

    return new Promise((resolve, reject) => {
      // Use inflate directly on the compressed data
      inflate(compressedData, { size: entry.uncompressedSize }, async (err, inflated) => {
        if (err) {
          reject(new Error(`Failed to inflate ${entry.fileName}: ${err}`));
          return;
        }

        try {
          const extractedFile = new ExtractedFile(entry.fileName, inflated);

          // Only do replacement if this file hasn't been visited in the current chain
          if (!visitedPaths[entry.fileName]) {
            await this._replaceFiles(extractedFile, visitedPaths);
          }

          this._extractedFileCache[entry.fileName] = extractedFile;
          resolve(extractedFile);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async file(filename) {
    if (this._loadingError) {
      return Promise.reject(this._loadingError);
    }

    await this._metadataPromise;
    const entry = this._entriesMap[filename];

    if (!entry) {
      throw new Error(`File not found: ${filename}`);
    }

    return this._extractFile(entry);
  }

  async files(path) {
    if (this._loadingError) {
      return Promise.reject(this._loadingError);
    }

    await this._metadataPromise;
    const promises = Object.values(this._entriesMap)
      .filter(entry => entry.fileName.startsWith(path))
      .map(entry => this._extractFile(entry));

    return Promise.all(promises);
  }

  async filesFromExtension(extension) {
    if (this._loadingError) {
      return Promise.reject(this._loadingError);
    }

    await this._metadataPromise;
    const promises = Object.values(this._entriesMap)
      .filter(entry => entry.fileName.endsWith(extension))
      .map(entry => this._extractFile(entry));

    return Promise.all(promises);
  }
  close() {
    for (const file of Object.values(this._extractedFileCache)) {
      file.close();
    }
    this._extractedFileCache = {};
    this._segmentData.clear();
    this._metadata = null;
  }
}
