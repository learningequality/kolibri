const baseConfig = require('kolibri-jest-config/jest.conf');

module.exports = Object.assign(baseConfig, {
  // Make sure we transpile any raw vue or ES6 files
  transformIgnorePatterns: [
    '/node_modules/(?!(keen-ui|epubjs|kolibri-common|kolibri|kolibri-design-system|kolibri-constants|uuid)/).*/',
  ],
  collectCoverageFrom: [
    'kolibri/**/assets/src/**/*.{js,vue}',
    '!**/node_modules/**',
    'kolibri/**/**/assets/src/**/*.{js,vue}',
    'packages/*/src/*.js',
  ],
});
