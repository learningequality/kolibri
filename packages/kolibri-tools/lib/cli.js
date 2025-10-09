#!/usr/bin/env node
const { Command } = require('commander');
const version = require('../package.json');
const logger = require('./logging');

const cliLogging = logger.getLogger('Kolibri CLI');

const program = new Command();

program.version(version).description('Tools for Kolibri frontend plugins');

// Build
program.command('build').action(function () {
  cliLogging.error('The build command has been moved!');
  cliLogging.error('Please use the kolibri-build package instead');
  cliLogging.error('Then run: kolibri-build dev (for development)');
  cliLogging.error('Or run: kolibri-build prod (for production)');
  cliLogging.error('Or run: kolibri-build clean (to clean assets)');
  process.exit(1);
});

// Lint
program.command('lint').action(function () {
  cliLogging.error('The lint command has been removed!');
  cliLogging.error('Please use the kolibri-format package instead.');
  process.exit(1);
});

// Test
program.command('test').action(function () {
  cliLogging.error('The test command has been moved!');
  cliLogging.error('Please use the kolibri-jest-config package instead');
  cliLogging.error('Then run: jest --config node_modules/kolibri-jest-config/jest.conf');
  process.exit(1);
});

// Compress
program.command('compress').action(function () {
  cliLogging.error('The compress command has been moved!');
  cliLogging.error('Please use the kolibri-build package instead');
  cliLogging.error('Then run: kolibri-build compress [files...]');
  process.exit(1);
});

// I18N commands
[
  'i18n-code-gen',
  'i18n-extract-messages',
  'i18n-transfer-context',
  'i18n-create-message-files',
  'i18n-untranslated-messages',
  'i18n-profile',
  'i18n-audit',
].forEach(command => {
  program.command(command).action(function () {
    cliLogging.error(`The ${command} command has been moved!`);
    cliLogging.error('Please use the kolibri-i18n package instead');
    cliLogging.error(`Then run: kolibri-i18n ${command.replace('i18n-', '')}`);
    process.exit(1);
  });
});

// Core API migration

program
  .command('migrate')
  .arguments('[files...]', 'List of custom file globs or file names to convert')
  .action(function (files, options) {
    if (!files.length) {
      program.help();
    } else {
      const { run: jscodeshift } = require('jscodeshift/src/Runner');
      const glob = require('./glob');
      const transformPath = require.resolve('./apiTransform.js');
      const ignore = options.ignore;
      Promise.all(
        files.map(file => {
          const matches = glob.sync(file, { ignore });
          return jscodeshift(transformPath, matches, {
            dry: false,
            print: false,
            verbose: 0,
          });
        }),
      );
    }
  });

program.parse(process.argv);
