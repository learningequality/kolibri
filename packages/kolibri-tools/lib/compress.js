const { constants, createGzip } = require('node:zlib');
const { pipeline } = require('node:stream');
const {
  createReadStream,
  createWriteStream,
  statSync,
  truncate,
  writeFileSync,
} = require('node:fs');
const logger = require('./logging');

const logging = logger.getLogger('Kolibri Compressor');

function compressFile(input) {
  return new Promise(resolve => {
    const gzip = createGzip({
      level: constants.Z_BEST_COMPRESSION,
    });
    const source = createReadStream(input);
    const destination = createWriteStream(input + '.gz');
    pipeline(source, gzip, destination, err => {
      if (err) {
        logging.error('An error occurred compressing file: ', input);
        logging.error(err);
        resolve();
      } else {
        const sourceStats = statSync(input);
        const destStats = statSync(input + '.gz');
        truncate(input, err => {
          if (err) {
            logging.error('An error occurred truncating original file: ', input);
          }
          logging.info(
            'Successfully compressed:',
            input,
            'by',
            (1 - destStats.size / sourceStats.size) * 100,
            '%',
          );
          if (destStats.size / sourceStats.size > 0.75) {
            logging.warn('Compressed size is more than 75% of original size');
          }
          writeFileSync(input + '.file_size', sourceStats.size.toString(), { encoding: 'utf-8' });
          resolve();
        });
      }
    });
  });
}

module.exports = compressFile;
