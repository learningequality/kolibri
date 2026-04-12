const path = require('node:path');
const babelConfig = require('./babel.config');

const moduleNameMapper = {
  '^testUtils$': path.resolve(__dirname, './testUtils'),
  '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|css|scss|sass)$':
    path.resolve(__dirname, './fileMock.js'),
};

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
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://kolibri.time',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest',
  },
  transformIgnorePatterns: [
    // Ignore all node_modules except kolibri packages
    // Works with both yarn (node_modules/kolibri) and pnpm
    // (node_modules/.pnpm/kolibri-*@version/...). Single pattern handles both:
    // - pnpm first node_modules: node_modules/.pnpm/kolibri-*@version/...
    // - pnpm nested node_modules: .../node_modules/kolibri-*/...
    // - yarn flat structure: node_modules/kolibri-*/...
    'node_modules/(?!(\\.pnpm/kolibri|kolibri))',
  ],
  snapshotSerializers: ['jest-serializer-vue'],
  setupFilesAfterEnv: [path.resolve(__dirname, './setup')],
  coverageDirectory: '<rootDir>/coverage',
  verbose: false,
};
