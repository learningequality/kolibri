const path = require('path');
const apiSpecAliases = require('../frontend_build/src/apiSpecExportTools').coreAliases();

const moduleNameMapper = {
  '^testUtils$': path.resolve(__dirname, './testUtils'),
};

Object.keys(apiSpecAliases).forEach(key => {
  moduleNameMapper['^' + key.replace(/\./g, '\\.') + '$'] = apiSpecAliases[key];
});

module.exports = {
  globals: {
    __kolibriModuleName: 'testmodule',
    __version: 'testversion',
    __events: {},
    __once: {},
    __copyrightYear: '2018',
  },
  rootDir: path.resolve(__dirname, '../'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  moduleNameMapper,
  testURL: 'http://kolibri.time',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '<rootDir>/node_modules/vue-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(keen-ui)/).*/'],
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  setupFiles: [path.resolve(__dirname, './setup')],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'frontend_build/src/*.js',
    'kolibri/**/assets/src/**/*.{js,vue}',
    '!**/node_modules/**',
    'kolibri/**/**/assets/src/**/*.{js,vue}',
  ],
};
