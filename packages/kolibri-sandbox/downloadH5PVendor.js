var fs = require('node:fs');
var https = require('node:https');
var path = require('node:path');
var url = require('node:url');
var JSZip = require('jszip');
var { PurgeCSS } = require('purgecss');

const purger = new PurgeCSS();

const h5pCommit = fs.readFileSync(path.resolve(__dirname, './.h5p-commit-sha'), 'utf8');

const zipUrl = `https://codeload.github.com/h5p/h5p-php-library/zip/${h5pCommit}`;

const targetFolder = path.resolve(__dirname, './vendor/h5p');

const h5pStaticFolder = path.resolve(__dirname, '../../kolibri/core/content/static/h5p');

const logging = console; // eslint-disable-line no-console

const fileManifest = [
  /styles\//,
  /fonts\//,
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
  https.get(url.parse(zipUrl), function (res) {
    if (res.statusCode !== 200) {
      logging.log(res);
      // handle error
      return;
    }
    var data = [];

    // don't set the encoding, it will break everything !
    // or, if you must, set it to null. In that case the chunk will be a string.

    res.on('data', function (chunk) {
      data.push(chunk);
    });

    res.on('end', function () {
      var buf = Buffer.concat(data);
      let i = 0;
      JSZip.loadAsync(buf)
        .then(function (zip) {
          return Promise.all(
            fileManifest.map(fileRegex => {
              return Promise.all(
                zip.file(fileRegex).map(file => {
                  const outputPath = path.resolve(
                    targetFolder,
                    file.name.replace(/h5p-php-library-[^/]+\//, ''),
                  );
                  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
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
                        .on('finish', function () {
                          i += 1;
                          resolve();
                        });
                    }
                  });
                }),
              );
            }),
          );
        })
        .then(() => {
          logging.log(`${i} files downloaded and unpacked`);
        });
    });
  });
}

fs.rm(targetFolder, { recursive: true, force: true }, err => {
  if (!err) {
    fs.rm(h5pStaticFolder, { recursive: true, force: true }, err => {
      if (!err) {
        downloadFiles();
      }
    });
  }
});
