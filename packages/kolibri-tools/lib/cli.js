#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const version = require('../package.json').version;
const logger = require('./logging');
const readWebpackJson = require('./read_webpack_json');
const webpackConfigProd = require('./webpack.config.prod');
const webpackConfigDev = require('./webpack.config.dev');
const webpackConfigI18N = require('./webpack.config.trs');

// ensure the correct version of node is being used
// (specified in package.json)
require('engine-strict').check();

const cliLogging = logger.getLogger('Kolibri CLI');

function list(val) {
  return val.split(',');
}

program.version(version).description('Tools for Kolibri frontend plugins');

// Build
program
  .command('build')
  .description('Build frontend assets for Kolibri frontend plugins')
  .arguments(
    '<mode>',
    'Mode to run in, options are: d/dev/development, p/prod/production, i/i18n/internationalization'
  )
  .option('-f , --file <file>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .action(function(mode, options) {
    const webpack = require('webpack');
    const { fork } = require('child_process');
    const os = require('os');
    const buildLogging = logger.getLogger('Kolibri Build');
    const modes = {
      DEV: 'dev',
      PROD: 'prod',
      I18N: 'i18n',
    };
    const modeMaps = {
      d: modes.DEV,
      dev: modes.DEV,
      development: modes.DEV,
      p: modes.PROD,
      prod: modes.PROD,
      production: modes.PROD,
      i: modes.I18N,
      i18n: modes.I18N,
      internationalization: modes.I18N,
    };
    if (typeof mode !== 'string') {
      cliLogging.error('Build mode must be specified');
      process.exit(1);
    }
    mode = modeMaps[mode];
    if (!mode) {
      cliLogging.error('Build mode invalid value');
      program.help();
      process.exit(1);
    }
    const bundleData = readWebpackJson({
      pluginFile: options.file,
      plugins: options.plugins,
    });
    const webpackConfig = {
      [modes.PROD]: webpackConfigProd,
      [modes.DEV]: webpackConfigDev,
      [modes.I18N]: webpackConfigI18N,
    }[mode];
    let config;
    if (mode === modes.DEV) {
      const numberOfBundles = bundleData.length;
      let currentlyCompiling = 0;
      const children = [];
      for (let index = 0; index < numberOfBundles; index++) {
        const data = JSON.stringify(bundleData[index]);
        const forked = fork(path.resolve(__dirname, './webpackdevserver.js'), {
          env: {
            data,
            index,
          },
        });
        children.push(forked);
        forked.on('exit', (code, signal) => {
          children.forEach(process => {
            process.kill(signal);
          });
          process.exit(code);
        });
        forked.on('message', msg => {
          if (msg === 'compile') {
            currentlyCompiling += 1;
          } else if (msg === 'done') {
            currentlyCompiling -= 1;
          }
          if (currentlyCompiling === 0) {
            buildLogging.info('All builds complete!');
          }
        });
      }
    } else {
      config = webpackConfig(bundleData);
      webpack(config, (err, stats) => {
        if (stats.hasErrors()) {
          buildLogging.error('There was a build error');
          buildLogging.log(stats.toString('errors-only'));
          process.exit(1);
        }
        process.exit(0);
      });
    }
  });

// Lint
program
  .command('lint')
  .description('Run linting on files or files matching glob patterns')
  .option('-f , --files <files...>', 'Set custom file globs or file names, comma separated', list, [
    '{kolibri*/**/assets,packages}/**/*.{js,vue,scss,less,css}',
  ])
  .option('-w, --write', 'Write autofixes to file', false)
  .option('-e, --encoding <string>', 'Text encoding of file', 'utf-8')
  .option('-m, --monitor', 'Monitor files and check on change', false)
  .option('-i, --ignore <patterns...>', 'Ignore these comma separated patterns', list, [
    '**/node_modules/**',
    '**/static/**',
  ])
  .action(function(options) {
    if (!(options instanceof program.Command)) {
      cliLogging.error('lint subcommand takes no positional arguments');
      process.exit(1);
    }
    const glob = require('glob');
    const { logging, lint, noChange } = require('./lint');
    const chokidar = require('chokidar');
    const watchMode = options.monitor;
    const ignore = options.ignore;
    const files = options.files;

    if (!files.length) {
      program.help();
    } else {
      const runLinting = file => lint(Object.assign({}, options, { file }));
      if (watchMode) {
        logging.info('Initializing watcher for the following patterns: ' + files.join(', '));
        const watcher = chokidar.watch(files, { ignored: ignore });
        watcher.on('change', runLinting);
      } else {
        Promise.all(
          files.map(file => {
            const matches = glob.sync(file, {
              ignore,
            });
            return Promise.all(
              matches.map(globbedFile => {
                return runLinting(globbedFile)
                  .then(formatted => {
                    return formatted.code;
                  })
                  .catch(error => {
                    logging.error(error.error ? error.error : error);
                    return error.code;
                  });
              })
            ).then(sources => {
              return sources.reduce((code, result) => {
                return Math.max(code, result);
              }, noChange);
            });
          })
        ).then(sources => {
          process.exit(
            sources.reduce((code, result) => {
              return Math.max(code, result);
            }, noChange)
          );
        });
      }
    }
  });

// Test
program
  .command('test')
  .option(
    '--extraConfig [extraConfig]',
    'Additional configuration to merge and overwrite the default jest config'
  )
  .allowUnknownOption()
  .action(function(options) {
    const baseConfig = require('../jest_config/jest.conf.js');
    if (process.env.NODE_ENV == null) {
      process.env.NODE_ENV = 'test';
    }
    let config;
    if (options.extraConfig) {
      const importConfig = require(path.resolve(process.cwd(), options.extraConfig));
      config = Object.assign({}, baseConfig, importConfig);
      const extraConfigIndex = process.argv.findIndex(item => item === '--extraConfig');
      process.argv.splice(extraConfigIndex, 2);
    } else {
      config = baseConfig;
    }
    process.argv.push('--config');
    process.argv.push(JSON.stringify(config));
    require('jest-cli/build/cli').run();
  });

program.parse(process.argv);
