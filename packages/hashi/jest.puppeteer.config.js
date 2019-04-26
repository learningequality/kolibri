const path = require('path');

module.exports = {
  exitOnPageError: false,
  server: {
    command: 'node ' + path.resolve(__dirname, './server.js'),
    launchTimeout: 30000,
    port: 6543,
  },
};
