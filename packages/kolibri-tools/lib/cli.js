#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const program = require('commander');
const checkVersion = require('check-node-version');
const ini = require('ini');
const get = require('lodash/get');
const version = require('../package.json');
const logger = require('./logging');

const readWebpackJson = require('./read_webpack_json');

const cliLogging = logger.getLogger('Kolibri CLI');

function list(val) {
  return val.split(',');
}

function filePath(val) {
  if (val) {
    return path.resolve(process.cwd(), val);
  }
}

let configFile;
try {
  configFile = fs.readFileSync(path.join(process.cwd(), './setup.cfg'), 'utf-8');
} catch (e) {
  // do nothing
}

const config = ini.parse(configFile || '');

program.version(version).description('Tools for Kolibri frontend plugins');

// Build
program
  .command('build')
  .description('Build frontend assets for Kolibri frontend plugins')
  .arguments('<mode>', 'Mode to run in, options are: d/dev/development, p/prod/production, c/clean')
  .option('-f , --file <file>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .option(
    '--pluginPath <pluginPath>',
    'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
    String,
    ''
  )
  .option('--parallel <parallel>', 'Run multiple bundles in parallel', Number, 0)
  .option('-h, --hot', 'Use hot module reloading in the webpack devserver', false)
  .option('-p, --port <port>', 'Set a port number to start devserver on', Number, 3000)
  .option('--host <host>', 'Set a host to serve devserver', String, '0.0.0.0')
  .option('--json', 'Output webpack stats in JSON format - only works in prod mode', false)
  .option('--cache', 'Use cache in webpack', false)
  .action(function(mode, options) {
    const buildLogging = logger.getLogger('Kolibri Build');
    const modes = {
      DEV: 'dev',
      PROD: 'prod',
      CLEAN: 'clean',
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
    };
    if (typeof mode !== 'string') {
      cliLogging.error('Build mode must be specified');
      process.exit(1);
    }
    mode = modeMaps[mode];
    if (!mode) {
      cliLogging.error('Build mode invalid value');
      program.help();
    }

    if (options.hot && mode !== modes.DEV) {
      cliLogging.error('Hot module reloading can only be used in dev mode.');
      process.exit(1);
    }

    if (options.json && mode !== modes.PROD) {
      cliLogging.error('Stats can only be output in production build mode.');
      process.exit(1);
    }

    const bundleData = readWebpackJson({
      pluginFile: options.file,
      plugins: options.plugins,
      pluginPath: options.pluginPath,
    });
    if (!bundleData.length) {
      cliLogging.error('No valid bundle data was returned from the plugins specified');
      process.exit(1);
    }

    if (mode === modes.CLEAN) {
      const clean = require('./clean');
      clean(bundleData);
      return;
    }

    const webpackMode = {
      [modes.PROD]: 'production',
      [modes.DEV]: 'development',
      [modes.STATS]: 'production',
    }[mode];

    const buildOptions = {
      hot: options.hot,
      port: options.port,
      mode: webpackMode,
      cache: options.cache,
    };

    const webpackConfig = require('./webpack.config.plugin');

    const webpackArray = bundleData.map(bundle => webpackConfig(bundle, buildOptions));

    if (options.parallel) {
      webpackArray.parallelism = options.parallel;
    }

    const webpack = require('webpack');

    const compiler = webpack(webpackArray);

    compiler.hooks.done.tap('Kolibri', () => {
      buildLogging.info('Build complete');
    });

    if (mode === modes.DEV) {
      const devServerOptions = {
        hot: options.hot,
        liveReload: !options.hot,
        host: options.host,
        port: options.port,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        setupMiddlewares: (middlewares, devServer) => {
          if (!devServer) {
            throw new Error('webpack-dev-server is not defined');
          }
          const openInEditor = require('launch-editor-middleware');

          middlewares.unshift({
            name: 'open-in-editor',
            path: '/__open-in-editor',
            middleware: openInEditor(),
          });

          return middlewares;
        },
      };

      const WebpackDevServer = require('webpack-dev-server');
      const server = new WebpackDevServer(devServerOptions, compiler);
      server.start();
    } else {
      compiler.run((err, stats) => {
        if (err || stats.hasErrors()) {
          buildLogging.error(err || stats.toString('errors-only'));
          process.exit(1);
        }
        if (options.json) {
          // Recommended output stats taken from:
          // https://github.com/statoscope/statoscope/tree/master/packages/webpack-plugin#which-stats-flags-statoscope-use
          // Can use in conjunction with statoscope.
          const statsJson = stats.toJson({
            all: false, // disable all the stats
            hash: true, // compilation hash
            entrypoints: true, // entrypoints
            chunks: true, // chunks
            chunkModules: true, // modules
            reasons: true, // modules reasons
            ids: true, // IDs of modules and chunks (webpack 5)
            dependentModules: true, // dependent modules of chunks (webpack 5)
            chunkRelations: true, // chunk parents, children and siblings (webpack 5)
            cachedAssets: true, // information about the cached assets (webpack 5)

            nestedModules: true, // concatenated modules
            usedExports: true, // used exports
            providedExports: true, // provided imports
            assets: true, // assets
            chunkOrigins: true, // chunks origins stats (to find out which modules require a chunk)
            version: true, // webpack version
            builtAt: true, // build at time
            timings: true, // modules timing information
            performance: true, // info about oversized assets
          });
          mkdirp.sync('./.stats');
          for (let stat of statsJson.children) {
            fs.writeFileSync(`.stats/${stat.name}.json`, JSON.stringify(stat, null, 2), {
              encoding: 'utf-8',
            });
          }
        }
      });
    }
  });

const ignoreDefaults = ['**/node_modules/**', '**/static/**'];

// Lint
program
  .command('lint')
  .arguments('[files...]', 'List of custom file globs or file names to lint')
  .description('Run linting on files or files matching glob patterns')
  .option('-w, --write', 'Write autofixes to file', false)
  .option('-e, --encoding <string>', 'Text encoding of file', 'utf-8')
  .option('-m, --monitor', 'Monitor files and check on change', false)
  .option(
    '-i, --ignore <patterns...>',
    'Ignore these comma separated patterns',
    list,
    ignoreDefaults
  )
  .option('-p, --pattern <string>', 'Lint only files that match this comma separated pattern', null)
  .action(function(args, options) {
    const files = [];
    if (!(args instanceof program.Command)) {
      files.push(...args);
    } else {
      options = args;
    }

    let patternCheck;
    if (!files.length && !options.pattern) {
      cliLogging.error('Must specify files or glob patterns to lint!');
      process.exit(1);
    } else if (!files.length) {
      files.push(options.pattern);
    } else {
      const Minimatch = require('minimatch').Minimatch;
      patternCheck = new Minimatch(options.pattern, {});
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
        if (patternCheck) {
          cliLogging.error('Must not specify files and --pattern in watch mode');
          process.exit(1);
        }
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
                if (!patternCheck || patternCheck.match(globbedFile)) {
                  return runLinting(globbedFile)
                    .then(formatted => {
                      return formatted.code;
                    })
                    .catch(error => {
                      logging.error(`Error processing file: ${globbedFile}`);
                      logging.error(error.error ? error.error : error);
                      return error.code;
                    });
                } else {
                  return Promise.resolve(0);
                }
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
  .option('--config [config]', 'Set configuration for jest tests')
  .allowUnknownOption()
  .action(function(options) {
    const baseConfigPath = path.resolve(__dirname, '../jest.conf');
    if (process.env.NODE_ENV == null) {
      process.env.NODE_ENV = 'test';
    }
    let config;
    if (options.config) {
      config = path.resolve(process.cwd(), options.config);
      const configIndex = process.argv.findIndex(item => item === '--config');
      process.argv.splice(configIndex, 2);
    } else {
      config = baseConfigPath;
    }
    // Remove the 'test' command that this was invoked with
    process.argv.splice(2, 1);
    process.argv.push('--config');
    process.argv.push(config);
    require('jest-cli/build/cli').run();
  });

// Compress
program
  .command('compress')
  .arguments('[files...]', 'List of custom file globs or file names to compress')
  .allowUnknownOption()
  .action(function(files) {
    if (!files.length) {
      program.command('compress').help();
    } else {
      const glob = require('glob');
      const compressFile = require('./compress');
      Promise.all(
        files.map(file => {
          const matches = glob.sync(file);
          return Promise.all(matches.map(compressFile));
        })
      );
    }
  });

const localeDataFolderDefault = filePath(get(config, ['kolibri:i18n', 'locale_data_folder']));

// Path to the kolibri locale language_info file, which we use if we are running
// from inside the Kolibri repository.
const _kolibriLangInfoPath = path.join(__dirname, '../../../kolibri/locale/language_info.json');

const langInfoDefault = fs.existsSync(_kolibriLangInfoPath)
  ? _kolibriLangInfoPath
  : path.join(__dirname, './i18n/language_info.json');

// I18N Intl and Vue-Intl Polyfill Code Generation
program
  .command('i18n-code-gen')
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault
  )
  .option(
    '--output-dir <outputDir>',
    'Directory in which to write JS intl polyfill files',
    filePath
  )
  .action(function(options) {
    const intlCodeGen = require('./i18n/intl_code_gen');
    intlCodeGen(options.outputDir, options.langInfo);
  });

// I18N Message Handling
program
  .command('i18n-extract-messages')
  .option('--pluginFile <pluginFile>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .option(
    '--pluginPath <pluginPath>',
    'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
    String,
    ''
  )
  .option(
    '-i, --ignore <patterns...>',
    'Ignore these comma separated patterns',
    list,
    ignoreDefaults
  )
  .option('-n , --namespace <namespace>', 'Set namespace for string extraction')
  .option(
    '--localeDataFolder <localeDataFolder>',
    'Set path to write locale files to',
    filePath,
    localeDataFolderDefault
  )
  .option(
    '--searchPath <searchPath>',
    'Set path to search for files containing strings to be extracted'
  )
  .action(function(options) {
    const bundleData = readWebpackJson.readPythonPlugins({
      pluginFile: options.pluginFile,
      plugins: options.plugins,
      pluginPath: options.pluginPath,
    });
    let pathInfo;
    if (bundleData.length) {
      pathInfo = bundleData.map(bundle => {
        return {
          moduleFilePath: bundle.plugin_path,
          name: bundle.module_path,
        };
      });
    } else if (options.namespace && options.localeDataFolder && options.searchPath) {
      pathInfo = [
        {
          moduleFilePath: options.searchPath,
          name: options.namespace,
        },
      ];
    } else {
      cliLogging.error(
        'Must specify either Kolibri plugins or search path, locale path, and namespace.'
      );
      program.command('i18n-extract-messages').help();
    }
    const extractMessages = require('./i18n/ExtractMessages');
    extractMessages(pathInfo, options.ignore, options.localeDataFolder);
  });

program
  .command('i18n-transfer-context')
  .option('--pluginFile <pluginFile>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .option(
    '--pluginPath <pluginPath>',
    'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
    String,
    ''
  )
  .option(
    '-i, --ignore <patterns...>',
    'Ignore these comma separated patterns',
    list,
    ignoreDefaults
  )
  .option('-n , --namespace <namespace>', 'Set namespace for string extraction')
  .option(
    '--localeDataFolder <localeDataFolder>',
    'Set path to write locale files to',
    filePath,
    localeDataFolderDefault
  )
  .option(
    '--searchPath <searchPath>',
    'Set path to search for files containing strings to be extracted'
  )
  .action(function(options) {
    const bundleData = readWebpackJson.readPythonPlugins({
      pluginFile: options.pluginFile,
      plugins: options.plugins,
      pluginPath: options.pluginPath,
    });
    let pathInfo;
    if (bundleData.length) {
      pathInfo = bundleData.map(bundle => {
        return {
          moduleFilePath: bundle.plugin_path,
          name: bundle.module_path,
        };
      });
    } else if (options.namespace && options.localeDataFolder && options.searchPath) {
      pathInfo = [
        {
          moduleFilePath: options.searchPath,
          name: options.namespace,
        },
      ];
    } else {
      cliLogging.error(
        'Must specify either Kolibri plugins or search path, locale path, and namespace.'
      );
      program.command('i18n-transfer-context').help();
    }
    const syncContext = require('./i18n/SyncContext');
    syncContext(pathInfo, options.ignore, options.localeDataFolder);
  });

// I18N Create runtime message files
program
  .command('i18n-create-message-files')
  .option('--pluginFile <pluginFile>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .option(
    '--pluginPath <pluginPath>',
    'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
    String,
    ''
  )
  .option(
    '-i, --ignore <patterns...>',
    'Ignore these comma separated patterns',
    list,
    ignoreDefaults
  )
  .option('-n , --namespace <namespace>', 'Set namespace for string extraction')
  .option(
    '--localeDataFolder <localeDataFolder>',
    'Set path to write locale files to',
    filePath,
    localeDataFolderDefault
  )
  .option(
    '--searchPath <searchPath>',
    'Set path to search for files containing strings to be extracted'
  )
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault
  )
  .action(function(options) {
    const bundleData = readWebpackJson({
      pluginFile: options.pluginFile,
      plugins: options.plugins,
      pluginPath: options.pluginPath,
    });
    let pathInfo;
    if (bundleData.length) {
      pathInfo = bundleData.map(bundle => {
        let buildConfig = require(bundle.config_path);
        if (bundle.index !== null) {
          buildConfig = buildConfig[bundle.index];
        }
        const entry = buildConfig.webpack_config.entry;
        return {
          moduleFilePath: bundle.plugin_path,
          namespace: bundle.module_path,
          name: bundle.name,
          entry,
        };
      });
    } else if (options.namespace && options.localeDataFolder && options.searchPath) {
      pathInfo = [
        {
          moduleFilePath: options.searchPath,
          namespace: options.namespace,
          name: options.namespace,
        },
      ];
    } else {
      cliLogging.error(
        'Must specify either Kolibri plugins or search path, locale path, and namespace.'
      );
      program.command('i18n-create-message-files').help();
    }
    const csvToJSON = require('./i18n/csvToJSON');
    csvToJSON(pathInfo, options.ignore, options.langInfo, options.localeDataFolder);
  });

// I18N Untranslated, used messages
program
  .command('i18n-untranslated-messages')
  .option('--pluginFile <pluginFile>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .option(
    '--pluginPath <pluginPath>',
    'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
    String,
    ''
  )
  .option(
    '-i, --ignore <patterns...>',
    'Ignore these comma separated patterns',
    list,
    ignoreDefaults
  )
  .option('-n , --namespace <namespace>', 'Set namespace for string extraction')
  .option(
    '--localeDataFolder <localeDataFolder>',
    'Set path to write locale files to',
    filePath,
    localeDataFolderDefault
  )
  .option(
    '--searchPath <searchPath>',
    'Set path to search for files containing strings to be extracted'
  )
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault
  )
  .action(function(options) {
    const bundleData = readWebpackJson({
      pluginFile: options.pluginFile,
      plugins: options.plugins,
      pluginPath: options.pluginPath,
    });
    let pathInfo;
    if (bundleData.length) {
      pathInfo = bundleData.map(bundle => {
        let buildConfig = require(bundle.config_path);
        if (bundle.index !== null) {
          buildConfig = buildConfig[bundle.index];
        }
        const entry = buildConfig.webpack_config.entry;
        return {
          moduleFilePath: bundle.plugin_path,
          namespace: bundle.module_path,
          name: bundle.name,
          entry,
        };
      });
    } else if (options.namespace && options.localeDataFolder && options.searchPath) {
      pathInfo = [
        {
          moduleFilePath: options.searchPath,
          namespace: options.namespace,
          name: options.namespace,
        },
      ];
    } else {
      cliLogging.error(
        'Must specify either Kolibri plugins or search path, locale path, and namespace.'
      );
      program.command('i18n-untranslated-messages').help();
    }
    const untranslatedMessages = require('./i18n/untranslatedMessages');
    untranslatedMessages(pathInfo, options.ignore, options.langInfo, options.localeDataFolder);
  });

// I18N Profile
program
  .command('i18n-profile')
  .option('--pluginFile <pluginFile>', 'Set custom file which lists plugins that should be built')
  .option(
    '-p, --plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    []
  )
  .option(
    '--pluginPath <pluginPath>',
    'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
    String,
    ''
  )
  .option(
    '-i, --ignore <patterns...>',
    'Ignore these comma separated patterns',
    list,
    ignoreDefaults
  )
  .option('-n , --namespace <namespace>', 'Set namespace for string extraction')
  .option(
    '--searchPath <searchPath>',
    'Set path to search for files containing strings to be extracted'
  )
  .option(
    '--output-file <outputFile>',
    'File path and name to which to write out the profile to',
    filePath
  )
  .action(function(options) {
    const bundleData = readWebpackJson({
      pluginFile: options.pluginFile,
      plugins: options.plugins,
      pluginPath: options.pluginPath,
    });
    let pathInfo;
    if (bundleData.length) {
      pathInfo = bundleData.map(bundle => {
        let buildConfig = require(bundle.config_path);
        if (bundle.index !== null) {
          buildConfig = buildConfig[bundle.index];
        }
        const entry = buildConfig.webpack_config.entry;
        return {
          moduleFilePath: bundle.plugin_path,
          namespace: bundle.module_path,
          name: bundle.name,
          entry,
        };
      });
    } else if (options.namespace && options.searchPath) {
      pathInfo = [
        {
          moduleFilePath: options.searchPath,
          namespace: options.namespace,
          name: options.namespace,
        },
      ];
    } else {
      cliLogging.error('Must specify either Kolibri plugins or search path and namespace.');
      program.command('i18n-profile').help();
    }
    const profileStrings = require('./i18n/ProfileStrings');
    profileStrings(pathInfo, options.ignore, options.outputFile);
  });

// Check engines, then process args
try {
  const engines = require(path.join(process.cwd(), 'package.json')).engines;
  checkVersion(engines, (err, results) => {
    if (err) {
      cliLogging.break();
      cliLogging.error(err);
      process.exit(1);
    }

    if (results.isSatisfied) {
      program.parse(process.argv);
      return;
    }

    for (const packageName of Object.keys(results.versions)) {
      if (!results.versions[packageName].isSatisfied) {
        let required = engines[packageName];
        cliLogging.break();
        cliLogging.error(`Incorrect version of ${packageName}.`);
        cliLogging.error(`${packageName} ${required} is required.`);
      }
    }

    cliLogging.break();
    process.exit(1);
  });
} catch (e) {
  program.parse(process.argv);
}
