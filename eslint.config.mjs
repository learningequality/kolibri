import { defineConfig } from 'eslint/config';
import kolibriFormatConfig from 'kolibri-format/eslint.config.mjs';
import cutoffConfig from './build_tools/eslint.cutoff.config.js';
import templateCutoff from './build_tools/eslint.cutoff-template.mjs';

const CJS_RULES = {
  'import-x/no-commonjs': 'off',
  'import-x/no-amd': 'off',
  'import-x/no-import-module-exports': 'off',
};

const nodeTools = [
  'build_tools/**',
  '**/buildConfig.js',
  '**/*.config.{js,mjs,cjs}',
  'jest.conf.js',
  'packages/{eslint-plugin-kolibri,kolibri-build,kolibri-css-variables,kolibri-format,kolibri-glob,kolibri-i18n,kolibri-jest-config}/**',
  'packages/build_kolibri_package.js',
  'packages/kolibri-sandbox/compat.js',
  'kolibri/plugins/perseus_viewer/guardSignalsDisposal.js',
];

export default defineConfig([
  ...kolibriFormatConfig,
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    ignores: nodeTools,
    extends: [...cutoffConfig, templateCutoff(cutoffConfig)],
  },

  // Node.js-only packages — remain CommonJS until they migrate to ESM
  {
    files: [
      'build_tools/eslint.cutoff*.js',
      'packages/browserslist-config-kolibri/**',
      'packages/eslint-plugin-kolibri/**',
      'packages/kolibri-build/**',
      'packages/kolibri-format/**',
      'packages/kolibri-glob/**',
      'packages/kolibri-i18n/**',
      'packages/kolibri-jest-config/**',
      'packages/kolibri-logging/**',
      'packages/kolibri-css-variables/**',
      'packages/build_kolibri_package.js',
      'kolibri/**/h5p_build/**',
      'kolibri/**/bloom_build/**',
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

  // @sentry/vue re-exports @sentry/browser, whose `main` is CommonJS that import-x cannot read.
  {
    files: ['python_packages/kolibri-sentry-plugin/**'],
    rules: { 'import-x/namespace': 'off' },
  },
]);
