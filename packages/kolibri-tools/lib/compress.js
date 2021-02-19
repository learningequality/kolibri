const { constants, createGzip } = require('zlib');
const { pipeline } = require('stream');
const { createReadStream, createWriteStream } = require('fs');
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
      } else {
        logging.info('Successfully compressed: ', input);
      }
      resolve();
    });
  });
}

module.exports = compressFile;
