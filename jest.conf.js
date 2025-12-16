const baseConfig = require('kolibri-jest-config/jest.conf');

module.exports = Object.assign(baseConfig, {
  // Only match *.spec.js files - exclude utility files in __tests__ folders
  testMatch: ['**/__tests__/**/*.spec.js', '**/?(*.)spec.js'],
  // Make sure we transpile any raw vue or ES6 files
  transformIgnorePatterns: [
    '/node_modules/(?!(keen-ui|epubjs|kolibri-common|kolibri|kolibri-design-system|kolibri-constants|uuid)/).*/',
  ],
  collectCoverageFrom: [
    'kolibri/**/frontend/**/*.{js,vue}',
    '!**/node_modules/**',
    'kolibri/**/**/frontend/**/*.{js,vue}',
    'packages/*/src/*.js',
  ],
});
