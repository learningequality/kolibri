#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { Command } = require('commander');
const checkVersion = require('check-node-version');
const ini = require('ini');
const toml = require('toml');
const get = require('lodash/get');
const version = require('../package.json');
const logger = require('./logging');

const readWebpackJson = require('./read_webpack_json');

const cliLogging = logger.getLogger('Kolibri CLI');

const program = new Command();

function list(val) {
  // Handle the differences between the TOML and cfg parsers: TOML returns an array already,
  // but cfg needs some post-processing
  if (Array.isArray(val)) return val;
  return val.split(',');
}

function filePath(val) {
  if (val) {
    return path.resolve(process.cwd(), val);
  }
}

let configFile;
let configSectionPath;
let config;
try {
  configFile = fs.readFileSync(path.join(process.cwd(), './pyproject.toml'), 'utf-8');
  // The group `[tool.kolibri.i18n]` in TOML is turned into nested objects by
  // the parser, so needs nested lookups to get its keys; hence a path.
  configSectionPath = ['tool', 'kolibri', 'i18n'];
  config = toml.parse(configFile);
} catch (e) {
  try {
    // try the old-style setup.cfg
    configFile = fs.readFileSync(path.join(process.cwd(), './setup.cfg'), 'utf-8');
    configSectionPath = ['kolibri:i18n'];
    config = ini.parse(configFile);
  } catch (e) {
    // do nothing, use a default empty config
    configSectionPath = ['null'];
    config = ini.parse('');
  }
}

program.version(version).description('Tools for Kolibri frontend plugins');

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

function runWebpackBuild(mode, bundleData, devServer, options, cb = null) {
  const buildLogging = logger.getLogger('Kolibri Build');
  const webpackMode = {
    [modes.PROD]: 'production',
    [modes.DEV]: 'development',
    [modes.STATS]: 'production',
  }[mode];

  const buildOptions = {
    hot: options.hot && devServer,
    port: devServer && options.port,
    mode: webpackMode,
    cache: options.cache,
    transpile: options.transpile,
    devServer,
    requireKdsPath: options.requireKdsPath,
    kdsPath: options.kdsPath,
  };

  const webpackConfig = require('./webpack.config.plugin');

  const webpackArray = bundleData.map(bundle => webpackConfig(bundle, buildOptions));

  if (options.parallel) {
    webpackArray.parallelism = options.parallel;
  }

  const webpack = require('webpack');

  const compiler = webpack(webpackArray);

  let start;

  compiler.hooks.run.tap('Kolibri', () => {
    start = new Date();
  });

  compiler.hooks.watchRun.tap('Kolibri', () => {
    start = new Date();
  });

  compiler.hooks.done.tap('Kolibri', () => {
    const time = new Date() - start;
    buildLogging.info(`Build complete in ${time / 1000} seconds`);
  });

  if (devServer) {
    const devServerOptions = {
      hot: options.hot,
      liveReload: !options.hot,
      host: options.host,
      port: options.port,
      client: {
        overlay: {
          errors: true,
          warnings: false,
          runtimeErrors: false,
        },
      },
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
        fs.mkdirSync('./.stats', { recursive: true });
        for (const stat of statsJson.children) {
          fs.writeFileSync(`.stats/${stat.name}.json`, JSON.stringify(stat, null, 2), {
            encoding: 'utf-8',
          });
        }
        compiler.close(closeErr => {
          if (closeErr) {
            buildLogging.error(closeErr);
            cb ? cb() : null;
          }
        });
      }
    });
  }
}

// Build
program
  .command('build')
  .description('Build frontend assets for Kolibri frontend plugins')
  .arguments('<mode>', 'Mode to run in, options are: d/dev/development, p/prod/production, c/clean')
  .option('-f , --file <file>', 'Set custom file which lists plugins that should be built')
  .option(
    '--plugins <plugins...>',
    'An explicit comma separated list of plugins that should be built',
    list,
    [],
  )
  .option(
    '--pluginPath <pluginPath>',
    'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
    String,
    '',
  )
  .option('--parallel <parallel>', 'Run multiple bundles in parallel', Number, 0)
  .option('-h, --hot', 'Use hot module reloading in the webpack devserver', false)
  .option('--port <port>', 'Set a port number to start devserver on', Number, 3000)
  .option('--host <host>', 'Set a host to serve devserver', String, '0.0.0.0')
  .option('--json', 'Output webpack stats in JSON format - only works in prod mode', false)
  .option('--cache', 'Use cache in webpack', false)
  .option('--transpile', 'Transpile code using Babel', false)
  .option(
    '--watchonly [plugins...]',
    'An explicit comma separated list of plugins that should be watched - all others will be built once only',
    list,
    [],
  )
  .option(
    '--require-kds-path',
    'Flag to check if yarn command is run using devserver-with-kds',
    false,
  )
  .option('--kds-path <kdsPath>', 'Full path to local kds directory', String, '')
  .option('--write-to-disk', 'Write files to disk instead of using webpack devserver', false)
  .action(function (mode, options) {
    if (options.requireKdsPath) {
      if (!options.kdsPath) {
        cliLogging.error(
          'The --require-kds-path flag was specified, but no --kds-path value was provided. Please include the path to the local KDS directory.',
        );
        process.exit(1);
      }
    }
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

    if (options.watchonly.length && mode !== modes.DEV) {
      cliLogging.error('Can only specify watchonly for dev builds');
      process.exit(1);
    }
    if (options.watchonly.length) {
      const unwatchedBundles = [];
      // Watch core for changes if KDS option is provided; all KDS components are linked to core.
      if (options.requireKdsPath && !options.watchonly.includes('core')) {
        options.watchonly.push('core');
      }
      const findModuleName = bundleDatum => {
        return !options.watchonly.some(m => bundleDatum.module_path.includes(m));
      };
      let foundIndex = bundleData.findIndex(findModuleName);
      while (foundIndex > -1) {
        // Remove the found bundle data entry from bundleData
        const unwatchedBundle = bundleData.splice(foundIndex, 1)[0];
        // Read the stats file for the bundle and see if we need to build it
        try {
          const statsFile = fs.readFileSync(unwatchedBundle.stats_file);
          const stats = JSON.parse(statsFile);
          // If the compilation has not completed, or it has completed
          // and it has a publicPath (i.e. it was built from a devserver)
          // then we need to rebuild the asset.
          if (stats.status !== 'done' || stats.publicPath) {
            // If we do, add it to our stats bundles.
            unwatchedBundles.push(unwatchedBundle);
          }
        } catch (e) {
          // If we got an error the file probably doesn't exist
          // or there was a problem with the stats file.
          // Rebuild!
          unwatchedBundles.push(unwatchedBundle);
        }
        foundIndex = bundleData.findIndex(findModuleName);
      }
      if (unwatchedBundles.length) {
        runWebpackBuild(mode, unwatchedBundles, false, {
          ...options,
          cache: false,
          hot: false,
        });
      }
    }

    if (options.writeToDisk && mode === modes.DEV) {
      cliLogging.warn(
        'Enabling write-to-disk mode may fill up your developer machine with lots of different built files if frequent changes are made.',
      );
    }

    runWebpackBuild(mode, bundleData, !options.writeToDisk && mode === modes.DEV, options);
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
  .option('-i, --ignore <string>', 'Ignore these comma separated patterns', list, ignoreDefaults)
  .option('-p, --pattern <string>', 'Lint only files that match this comma separated pattern', null)
  .action(function (files, options) {
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
    const glob = require('./glob');
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
                  return runLinting(globbedFile).catch(error => {
                    logging.error(`Error processing file: ${globbedFile}`);
                    logging.error(error.error ? error.error : error);
                    return error.code;
                  });
                } else {
                  return Promise.resolve(0);
                }
              }),
            ).then(sources => {
              return sources.reduce((code, result) => {
                return Math.max(code, result);
              }, noChange);
            });
          }),
        ).then(sources => {
          process.exit(
            sources.reduce((code, result) => {
              return Math.max(code, result);
            }, noChange),
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
  .action(function (options) {
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
    require('jest-cli/bin/jest');
  });

// Compress
program
  .command('compress')
  .arguments('[files...]', 'List of custom file globs or file names to compress')
  .allowUnknownOption()
  .action(function (files) {
    if (!files.length) {
      program.command('compress').help();
    } else {
      const glob = require('./glob');
      const compressFile = require('./compress');
      logger.warn(
        'The compress command is a destructive operation and will truncate any source files that are compressed. Please ensure you have a backup of the files you are compressing.',
      );
      Promise.all(
        files.map(file => {
          const matches = glob.sync(file);
          return Promise.all(matches.map(compressFile));
        }),
      );
    }
  });

const localeDataFolderDefault = filePath(
  get(config, configSectionPath.concat(['locale_data_folder'])),
);
const globalWebpackConfigDefault = filePath(
  get(config, configSectionPath.concat(['webpack_config'])),
);
const langInfoConfigDefault = filePath(get(config, configSectionPath.concat(['lang_info'])));
const langIgnoreDefaults = list(get(config, configSectionPath.concat(['ignore']), ''));

// Path to the kolibri locale language_info file, which we use if we are running
// from inside the Kolibri repository.
const _kolibriLangInfoPath = path.join(__dirname, '../../../kolibri/locale/language_info.json');

const langInfoDefault = langInfoConfigDefault
  ? langInfoConfigDefault
  : fs.existsSync(_kolibriLangInfoPath)
    ? _kolibriLangInfoPath
    : path.join(__dirname, './i18n/language_info.json');

// I18N Intl and Vue-Intl Polyfill Code Generation
program
  .command('i18n-code-gen')
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault,
  )
  .option(
    '--output-dir <outputDir>',
    'Directory in which to write JS intl polyfill files',
    filePath,
  )
  .action(function (options) {
    const intlCodeGen = require('./i18n/intl_code_gen');
    intlCodeGen(options.outputDir, options.langInfo);
  });

function _generatePathInfo({
  pluginFile,
  plugins,
  pluginPath,
  namespace,
  searchPath,
  webpackConfig,
} = {}) {
  const bundleData = readWebpackJson({
    pluginFile: pluginFile,
    plugins: plugins,
    pluginPath: pluginPath,
  });
  const pathInfoArray = [];
  if (bundleData.length) {
    pathInfoArray.push(
      ...bundleData.map(bundle => {
        let buildConfig = require(bundle.config_path);
        if (bundle.index !== null) {
          buildConfig = buildConfig[bundle.index];
        }
        const entry = buildConfig.webpack_config.entry;
        const aliases =
          buildConfig.webpack_config.resolve && buildConfig.webpack_config.resolve.alias;
        return {
          moduleFilePath: bundle.plugin_path,
          namespace: bundle.module_path,
          name: bundle.name,
          entry,
          aliases,
        };
      }),
    );
  }
  if (namespace.length && namespace.length == searchPath.length) {
    let aliases;
    if (webpackConfig) {
      const webpack = require('webpack');
      let config = require(webpackConfig);
      if (config instanceof Function) {
        config = config();
      }
      let buildConfig = webpack.config.getNormalizedWebpackOptions(config);
      if (buildConfig.length) {
        cliLogging.warn('Found an array webpack configuration, using the first config for aliases');
        buildConfig = buildConfig[0];
      }
      aliases = buildConfig.resolve.alias;
    }
    for (let i = 0; i < namespace.length; i++) {
      pathInfoArray.push({
        moduleFilePath: searchPath[i],
        namespace: namespace[i],
        name: namespace[i],
        aliases,
      });
    }
  }
  if (pathInfoArray.length) {
    return pathInfoArray;
  }
  cliLogging.error('This command requires one or more of the following combinations of arguments:');
  cliLogging.error('1) The --pluginFile, --plugins, or --pluginPath argument.');
  cliLogging.error('2) One or more pairs of the --searchPath and --namespace arguments.');
}

function _collect(value, previous) {
  return previous.concat([value]);
}

function _addPathOptions(cmd) {
  return cmd
    .option('--pluginFile <pluginFile>', 'Set custom file which lists plugins that should be built')
    .option(
      '-p, --plugins <plugins...>',
      'An explicit comma separated list of plugins that should be built',
      list,
      [],
    )
    .option(
      '--pluginPath <pluginPath>',
      'A system path to the plugin or module that should be added to the Python path so that it can be imported during build time',
      String,
      '',
    )
    .option(
      '-i, --ignore <patterns...>',
      'Ignore these comma separated patterns',
      list,
      langIgnoreDefaults.length ? langIgnoreDefaults : ignoreDefaults,
    )
    .option(
      '-n , --namespace <namespace>',
      'Set namespace for string extraction; this may be specified multiple times, but there must be an equal number of --searchPath arguments',
      _collect,
      [],
    )
    .option(
      '--localeDataFolder <localeDataFolder>',
      'Set path to write locale files to',
      filePath,
      localeDataFolderDefault,
    )
    .option(
      '--searchPath <searchPath>',
      'Set path to search for files containing strings to be extracted; this may be specified multiple times, but there must be an equal number of --namespace arguments',
      _collect,
      [],
    )
    .option(
      '--webpackConfig <webpackConfig>',
      'Set a webpack config to use for module aliases',
      filePath,
      globalWebpackConfigDefault,
    )
    .option(
      '--verbose',
      'Verbose debug messages. Only errors are printed unless this flag is set.',
    );
}

// I18N Message Handling
_addPathOptions(program.command('i18n-extract-messages')).action(function (options) {
  const pathInfo = _generatePathInfo(options);
  if (!pathInfo) {
    program.command('i18n-extract-messages').help();
  }
  const extractMessages = require('./i18n/ExtractMessages');
  extractMessages(pathInfo, options.ignore, options.localeDataFolder, options.verbose);
});

_addPathOptions(program.command('i18n-transfer-context')).action(function (options) {
  const pathInfo = _generatePathInfo(options);
  if (!pathInfo) {
    program.command('i18n-transfer-context').help();
  }
  const syncContext = require('./i18n/SyncContext');
  syncContext(pathInfo, options.ignore, options.localeDataFolder, options.verbose);
});

// I18N Create runtime message files
_addPathOptions(program.command('i18n-create-message-files'))
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault,
  )
  .action(function (options) {
    const pathInfo = _generatePathInfo(options);
    if (!pathInfo) {
      program.command('i18n-create-message-files').help();
    }
    const csvToJSON = require('./i18n/csvToJSON');
    csvToJSON(
      pathInfo,
      options.ignore,
      options.langInfo,
      options.localeDataFolder,
      options.verbose,
    );
  });

// I18N Untranslated, used messages
_addPathOptions(program.command('i18n-untranslated-messages'))
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault,
  )
  .action(function (options) {
    const pathInfo = _generatePathInfo(options);
    if (!pathInfo) {
      program.command('i18n-untranslated-messages').help();
    }
    const untranslatedMessages = require('./i18n/untranslatedMessages');
    untranslatedMessages(
      pathInfo,
      options.ignore,
      options.langInfo,
      options.localeDataFolder,
      options.verbose,
    );
  });

// I18N Profile
_addPathOptions(program.command('i18n-profile'))
  .option(
    '--output-file <outputFile>',
    'File path and name to which to write out the profile to',
    filePath,
  )
  .action(function (options) {
    const pathInfo = _generatePathInfo(options);
    if (!pathInfo) {
      program.command('i18n-profile').help();
    }
    const profileStrings = require('./i18n/ProfileStrings');
    profileStrings(pathInfo, options.ignore, options.outputFile, options.verbose);
  });

// I18N Ditto Audit
_addPathOptions(program.command('i18n-audit'))
  .option(
    '--output-file <outputFile>',
    'File path and name to which to write out the audit to',
    filePath,
  )
  .option(
    '--ditto-file <dittoFile>',
    'File paths of the CSV files to read the ditto strings from',
    filePath,
  )
  .action(function (options) {
    const pathInfo = _generatePathInfo(options);
    if (!pathInfo) {
      program.command('i18n-audit').help();
    }
    const auditStrings = require('./i18n/auditMessages');
    auditStrings(
      pathInfo,
      options.ignore,
      [options.dittoFile],
      options.outputFile,
      options.verbose,
    );
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
        const required = engines[packageName];
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
