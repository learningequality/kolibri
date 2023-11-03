import { unzip, strFromU8 } from 'fflate';

class File {
  constructor(name, obj) {
    this.name = name;
    this.obj = obj;
  }

  toString() {
    return strFromU8(this.obj);
  }
}

export default class ZipFile {
  constructor(file) {
    this.zipData = file instanceof Uint8Array ? file : new Uint8Array(file);
  }

  _getFiles(filter) {
    return new Promise((resolve, reject) => {
      unzip(this.zipData, { filter }, (err, unzipped) => {
        if (err) {
          reject(err);
          return;
        }
        if (!unzipped) {
          reject('No files found');
          return;
        }
        resolve(Object.entries(unzipped).map(([name, obj]) => new File(name, obj)));
      });
    });
  }

  file(filename) {
    return this._getFiles(file => file.name === filename).then(files => files[0]);
  }
  files(path) {
    return this._getFiles(file => file.name.startsWith(path));
  }
}
