const baseConfig = require('kolibri-tools/jest.conf');

module.exports = Object.assign(baseConfig, {
  transformIgnorePatterns: ['/node_modules/(?!(keen-ui|epubjs|kolibri-tools|kolibri)/).*/'],
  collectCoverageFrom: [
    'frontend_build/src/*.js',
    'kolibri/**/assets/src/**/*.{js,vue}',
    '!**/node_modules/**',
    'kolibri/**/**/assets/src/**/*.{js,vue}',
  ],
});
