const path = require('path');
const apiSpecAliases = require('../lib/apiSpecExportTools').coreAliases();
const babelConfig = require('./babel.config');

const moduleNameMapper = {
  '^testUtils$': path.resolve(__dirname, './testUtils'),
  '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|css)$': path.resolve(
    __dirname,
    './fileMock.js'
  ),
};

Object.keys(apiSpecAliases).forEach(key => {
  moduleNameMapper['^' + key.replace(/\\./g, '\\.') + '$'] = apiSpecAliases[key];
});

module.exports = {
  globals: {
    __kolibriModuleName: 'testmodule',
    __version: 'testversion',
    __copyrightYear: '2018',
    __webpack_public_path__: 'webpack_public_path',
    'vue-jest': {
      babelConfig,
    },
  },
  rootDir: path.resolve(process.cwd()),
  moduleFileExtensions: ['js', 'json', 'vue'],
  moduleNameMapper,
  testURL: 'http://kolibri.time',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(kolibri-tools|kolibri)/).*/'],
  snapshotSerializers: ['jest-serializer-vue'],
  setupFilesAfterEnv: [path.resolve(__dirname, './setup')],
  coverageDirectory: '<rootDir>/coverage',
  verbose: false,
};
