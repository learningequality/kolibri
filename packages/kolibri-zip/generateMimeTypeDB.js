const fs = require('fs');
const path = require('path');
const mimeDB = require('mime-db');

// Allowed file extensions for H5P from: https://h5p.org/allowed-file-extensions
const allowedFileExtensions = new Set([
  'bmp',
  'css',
  'csv',
  'diff',
  'doc',
  'docx',
  'eof',
  'gif',
  'jpeg',
  'jpg',
  'js',
  'json',
  'mp3',
  'mp4',
  'm4a',
  'odp',
  'ods',
  'odt',
  'ogg',
  'otf',
  'patch',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'rtf',
  'svg',
  'swf',
  'tif',
  'tiff',
  'ttf',
  'txt',
  'wav',
  'webm',
  'woff',
  'xls',
  'xlsx',
  'xml',
  'md',
  'textile',
  'vtt',
  // Additional file types for Kolibri
  'html',
  'htm',
  'xhtml',
]);

const output = {};

for (const key in mimeDB) {
  if (mimeDB[key].extensions) {
    for (const ext of mimeDB[key].extensions) {
      if (allowedFileExtensions.has(ext)) {
        output[ext] = key;
      }
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'src', 'mimetypes.json'), JSON.stringify(output));
