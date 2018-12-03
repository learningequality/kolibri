#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const version = require('../package.json').version;
const logger = require('./logging');
const readWebpackJson = require('./read_webpack_json');

// ensure the correct version of node is being used
// (specified in package.json)
require('engine-strict').check();

const cliLogging = logger.getLogger('Kolibri CLI');

function list(val) {
  return val.split(',');
}

program.version(version).description('Tools for Kolibri frontend plugins');

function statsCompletionCallback(bundleData) {
  const express = require('express');
  const http = require('http');
  const host = '127.0.0.1';
  const rootPort = 8888;
  if (bundleData.length > 1) {
    const app = express();
    let response = `<html>
    <body>
    <h1>Kolibri Stats Links</h1>
    <ul>`;
    bundleData.forEach((bundle, i) => {
      response += `<li><a href="http://${host}:${rootPort + i + 1}">${bundle.name}</a></li>`;
    });
    response += '</ul></body></html>';

    app.use('/', (req, res) => {
      res.send(response);
    });
    const server = http.createServer(app);
    server.listen(rootPort, host, () => {
      const url = `http://${host}:${server.address().port}`;
      logger.info(
        `Webpack Bundle Analyzer Reports are available at ${url}\n` + `Use ${'Ctrl+C'} to close it`
      );
    });
  } else {
    const url = `http://${host}:${rootPort + 1}`;
    logger.info(
      `Webpack Bundle Analyzer Report is available at ${url}\n` + `Use ${'Ctrl+C'} to close it`
    );
  }
}

// Build
program
  .command('build')
  .description('Build frontend assets for Kolibri frontend plugins')
  .arguments(
    '<mode>',
    'Mode to run in, options are: d/dev/development, p/prod/production, i/i18n/internationalization, c/clean, s/stats'
  )
  .option('-f , --file <file>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .option(
    '--pluginPaths <pluginPaths...>',
    'An explicit comma separated list of explicit file paths to plugins',
    list,
    []
  )
  .option('-m, --multi', 'Run using multiple cores to improve build speed', false)
  .option('-h, --hot', 'Use hot module reloading in the webpack devserver', false)
  .action(function(mode, options) {
    const { fork } = require('child_process');
    const buildLogging = logger.getLogger('Kolibri Build');
    const modes = {
      DEV: 'dev',
      PROD: 'prod',
      I18N: 'i18n',
      CLEAN: 'clean',
      STATS: 'stats',
    };
    const modeMaps = {
      c: modes.CLEAN,
      clean: modes.CLEAN,
      d: modes.DEV,
      dev: modes.DEV,
      development: modes.DEV,
      p: modes.PROD,
      prod: modes.PROD,
      production: modes.PROD,
      i: modes.I18N,
      i18n: modes.I18N,
      internationalization: modes.I18N,
      s: modes.STATS,
      stats: modes.STATS,
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
    const multi = options.multi || process.env.KOLIBRI_BUILD_MULTI;

    if (options.hot && mode != modes.DEV) {
      cliLogging.error('Hot module reloading can only be used in dev mode.');
      process.exit(1);
    }

    const buildOptions = { hot: options.hot };

    const bundleData = readWebpackJson({
      pluginFile: options.file,
      plugins: options.plugins,
      pluginPaths: options.pluginPaths,
    });
    if (!bundleData.length) {
      cliLogging.error('No valid bundle data was returned from the plugins specified');
      process.exit(1);
    }
    const buildModule = {
      [modes.PROD]: 'production.js',
      [modes.DEV]: 'webpackdevserver.js',
      [modes.I18N]: 'i18n.js',
      [modes.STATS]: 'bundleStats.js',
    }[mode];

    const modulePath = path.resolve(__dirname, buildModule);

    function spawnWebpackProcesses({ completionCallback = null, persistent = true } = {}) {
      const numberOfBundles = bundleData.length;
      let currentlyCompiling = numberOfBundles;
      // The way we are binding this callback to the webpack compilation hooks
      // it seems to miss this on first compilation, so we will only use this for
      // watched builds where rebuilds are possible.
      function startCallback() {
        currentlyCompiling += 1;
      }
      function doneCallback() {
        currentlyCompiling -= 1;
        if (currentlyCompiling === 0) {
          buildLogging.info('All builds complete!');
          if (completionCallback) {
            completionCallback(bundleData);
          }
        }
      }
      const children = [];
      for (let index = 0; index < numberOfBundles; index++) {
        if (multi) {
          const data = JSON.stringify(bundleData[index]);
          const options_data = JSON.stringify(buildOptions);
          const childProcess = fork(modulePath, {
            env: {
              data,
              index,
              options: options_data,
            },
            stdio: 'inherit',
          });
          children.push(childProcess);
          if (persistent) {
            childProcess.on('exit', (code, signal) => {
              children.forEach(child => {
                child.kill(signal);
              });
              process.exit(code);
            });
          }
          childProcess.on('message', msg => {
            if (msg === 'compile') {
              startCallback();
            } else if (msg === 'done') {
              doneCallback();
            }
          });
        } else {
          const buildFunction = require(modulePath);
          buildFunction(bundleData[index], index, startCallback, doneCallback, buildOptions);
        }
      }
    }

    if (mode === modes.CLEAN) {
      const clean = require('./clean');
      clean(bundleData);
    } else if (mode === modes.STATS) {
      spawnWebpackProcesses({
        completionCallback: statsCompletionCallback,
      });
    } else if (mode === modes.DEV) {
      spawnWebpackProcesses();
    } else {
      // Don't persist for production builds or message extraction
      spawnWebpackProcesses({
        persistent: false,
      });
    }
  });

// Lint
program
  .command('lint')
  .arguments('[files...]', 'List of custom file globs or file names to lint')
  .description('Run linting on files or files matching glob patterns')
  .option('-w, --write', 'Write autofixes to file', false)
  .option('-e, --encoding <string>', 'Text encoding of file', 'utf-8')
  .option('-m, --monitor', 'Monitor files and check on change', false)
  .option('-i, --ignore <patterns...>', 'Ignore these comma separated patterns', list, [
    '**/node_modules/**',
    '**/static/**',
  ])
  .action(function(args, options) {
    const files = [];
    if (!(args instanceof program.Command)) {
      files.push(...args);
    } else {
      options = args;
    }
    if (!files.length) {
      files.push('{kolibri*/**/assets,packages}/**/*.{js,vue,scss,less,css}');
    }
    const glob = require('glob');
    const { logging, lint, noChange } = require('./lint');
    const chokidar = require('chokidar');
    const watchMode = options.monitor;
    const ignore = options.ignore;

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
