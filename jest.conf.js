const baseConfig = require('kolibri-tools/jest.conf');

module.exports = Object.assign(baseConfig, {
  // Make sure we transpile any raw vue or ES6 files
  transformIgnorePatterns: ['/node_modules/(?!(keen-ui|epubjs|kolibri-tools|kolibri)/).*/'],
  collectCoverageFrom: [
    'kolibri/**/assets/src/**/*.{js,vue}',
    '!**/node_modules/**',
    'kolibri/**/**/assets/src/**/*.{js,vue}',
    'packages/hashi/src/*.js',
    'packages/kolibri-components/**/**/*.{js,vue}',
    'packages/kolibri-tools/lib/src/*.js',
  ],
});
