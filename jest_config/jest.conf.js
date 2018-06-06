const path = require('path');
const apiSpecAliases = require('../frontend_build/src/apiSpecExportTools').coreAliases();

apiSpecAliases.testUtils = path.resolve(__dirname, './testUtils');
apiSpecAliases.kolibri = path.resolve(__dirname, './kolibri');

module.exports = {
  globals: {
    kolibriGlobal: {},
    __kolibriModuleName: 'testmodule',
    __version: 'testversion',
    __events: {},
    __once: {},
  },
  rootDir: path.resolve(__dirname, '../'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  moduleNameMapper: apiSpecAliases,
  testURL: 'http://kolibri.time',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '<rootDir>/node_modules/vue-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(keen-ui)/).*/'],
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  setupFiles: [path.resolve(__dirname, './setup')],
  mapCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'kolibri/**/assets/src/**/*.{js,vue}',
    '!**/node_modules/**',
    'kolibri/**/**/assets/src/**/*.{js,vue}',
  ],
};
