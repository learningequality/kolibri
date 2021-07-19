var fs = require('fs');
var https = require('https');
var path = require('path');
var url = require('url');
const mkdirp = require('mkdirp');
var JSZip = require('jszip');
var { PurgeCSS } = require('purgecss');
var rimraf = require('rimraf');

const purger = new PurgeCSS();

const h5pCommit = 'eeefc1228b4294d75288be341e5dea97a10927cb';

const zipUrl = `https://codeload.github.com/h5p/h5p-php-library/zip/${h5pCommit}`;

const targetFolder = path.resolve(__dirname, './vendor/h5p');

const h5pStaticFolder = path.resolve(__dirname, '../../kolibri/core/content/static/h5p');

const fileManifest = [
  /styles\/h5p\.css/,
  /styles\/h5p-core-button\.css/,
  /styles\/h5p-confirmation-dialog\.css/,
  /fonts\/h5p-core-[0-9]+\.(eot|svg|ttf|woff)/,
  /images\/.*/,
  /js\/h5p-confirmation-dialog\.js/,
  /js\/h5p-content-type\.js/,
  /js\/h5p-event-dispatcher\.js/,
  /js\/h5p-resizer\.js/,
  /js\/h5p-x-api-event\.js/,
  /js\/h5p-x-api\.js/,
  /js\/h5p\.js/,
];

function downloadFiles() {
  https.get(url.parse(zipUrl), function(res) {
    if (res.statusCode !== 200) {
      console.log(res);
      // handle error
      return;
    }
    var data = [];

    // don't set the encoding, it will break everything !
    // or, if you must, set it to null. In that case the chunk will be a string.

    res.on('data', function(chunk) {
      data.push(chunk);
    });

    res.on('end', function() {
      var buf = Buffer.concat(data);
      let i = 0;
      JSZip.loadAsync(buf)
        .then(function(zip) {
          return Promise.all(
            fileManifest.map(fileRegex => {
              return Promise.all(
                zip.file(fileRegex).map(file => {
                  const outputPath = path.resolve(
                    targetFolder,
                    file.name.replace(/h5p-php-library-[^/]+\//, '')
                  );
                  mkdirp.sync(path.dirname(outputPath));
                  return new Promise(resolve => {
                    if (outputPath.endsWith('css')) {
                      file.async('string').then(text => {
                        return purger
                          .purge({
                            css: [
                              {
                                raw: text,
                              },
                            ],
                            safelist: [/^((?!hub).)*$/],
                            blocklist: [/hub/],
                            fontFace: true,
                          })
                          .then(result => {
                            const css = result[0].css;
                            return fs.writeFile(outputPath, css, () => {
                              i += 1;
                              resolve();
                            });
                          });
                      });
                    } else {
                      file
                        .nodeStream()
                        .pipe(fs.createWriteStream(outputPath))
                        .on('finish', function() {
                          i += 1;
                          resolve();
                        });
                    }
                  });
                })
              );
            })
          );
        })
        .then(() => {
          console.log(`${i} files downloaded and unpacked`);
        });
    });
  });
}

rimraf(targetFolder, { glob: false }, err => {
  if (!err) {
    rimraf(h5pStaticFolder, { glob: false }, err => {
      if (!err) {
        downloadFiles();
      }
    });
  }
});
