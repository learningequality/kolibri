import kolibriFormatConfig from 'kolibri-format/eslint.config.mjs';

const CJS_RULES = {
  'import-x/no-commonjs': 'off',
  'import-x/no-amd': 'off',
  'import-x/no-import-module-exports': 'off',
};

export default [
  ...kolibriFormatConfig,

  // Node.js-only packages — remain CommonJS until they migrate to ESM
  {
    files: [
      'packages/browserslist-config-kolibri/**',
      'packages/eslint-plugin-kolibri/**',
      'packages/kolibri-build/**',
      'packages/kolibri-format/**',
      'packages/kolibri-glob/**',
      'packages/kolibri-i18n/**',
      'packages/kolibri-jest-config/**',
      'packages/kolibri-logging/**',
      'packages/build_kolibri_package.js',
    ],
    rules: CJS_RULES,
  },

  // Every plugin has a buildConfig.js — blanket exemption for all of them
  {
    files: ['**/buildConfig.js'],
    rules: CJS_RULES,
  },

  // Auto-generated static files — too numerous to annotate individually
  {
    files: ['kolibri/**/static/**'],
    rules: CJS_RULES,
  },
];
