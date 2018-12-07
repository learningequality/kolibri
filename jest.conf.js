module.exports = {
  transformIgnorePatterns: ['/node_modules/(?!(keen-ui|epubjs)/).*/'],
  collectCoverageFrom: [
    'frontend_build/src/*.js',
    'kolibri/**/assets/src/**/*.{js,vue}',
    '!**/node_modules/**',
    'kolibri/**/**/assets/src/**/*.{js,vue}',
  ],
};
