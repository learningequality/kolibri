#!/usr/bin/env node
const fs = require('node:fs');
const { Command } = require('commander');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const logger = require('kolibri-logging');
const glob = require('kolibri-glob');

// Set default log level to info for development builds
logger.setDefaultLevel('info');

const version = require('../package.json');

const readWebpackJson = require('./read_webpack_json');
const webpackConfig = require('./webpack.config.plugin');
const clean = require('./clean');
const compressFile = require('./compress');

const cliLogging = logger.getLogger('Kolibri Build CLI');
const buildLogging = logger.getLogger('Kolibri Build');

const program = new Command();

function list(val) {
  // Handle the differences between the TOML and cfg parsers: TOML returns an array already,
  // but cfg needs some post-processing
  if (Array.isArray(val)) return val;
  return val.split(',');
}

program.version(version.version).description('Build tools for Kolibri frontend plugins');

function createWebpackCompiler(bundleData, options) {
  const buildOptions = {
    hot: options.hot,
    port: options.port,
    mode: options.development ? 'development' : 'production',
    cache: options.cache,
    transpile: options.transpile,
    devServer: options.devServer,
    requireKdsPath: options.requireKdsPath,
    kdsPath: options.kdsPath,
    setDevServerPublicPath: !options.writeToDisk,
  };

  const webpackArray = bundleData.map(bundle => webpackConfig(bundle, buildOptions));

  if (options.parallel) {
    webpackArray.parallelism = options.parallel;
  }

  const compiler = webpack(webpackArray);

  // Add timing hooks
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

  return compiler;
}

function startDevServer(compiler, options) {
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
    allowedHosts: [options.host, 'localhost'],
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    devMiddleware: {
      writeToDisk: options.writeToDisk,
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

  const server = new WebpackDevServer(devServerOptions, compiler);
  server.start();
}

function runProductionBuild(compiler, options = {}) {
  compiler.run((err, stats) => {
    if (err || stats.hasErrors()) {
      buildLogging.error(err || stats.toString('errors-only'));
      process.exit(1);
    }

    if (options.json) {
      writeStatsFiles(stats);
    }

    compiler.close(closeErr => {
      if (closeErr) {
        buildLogging.error(closeErr);
      }
    });
  });
}

function writeStatsFiles(stats) {
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
}

// Common options for build commands
function addBuildOptions(command) {
  return command
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
    .option('--cache', 'Use cache in webpack', false)
    .option('--transpile', 'Transpile code using Babel', false)
    .option(
      '--require-kds-path',
      'Flag to check if pnpm command is run using devserver-with-kds',
      false,
    )
    .option('--kds-path <kdsPath>', 'Full path to local kds directory', String, '');
}

function validateKdsOptions(options) {
  if (options.requireKdsPath) {
    if (!options.kdsPath) {
      cliLogging.error(
        'The --require-kds-path flag was specified, but no --kds-path value was provided. Please include the path to the local KDS directory.',
      );
      process.exit(1);
    }
  }
}

function getBundleData(options) {
  const bundleData = readWebpackJson({
    pluginFile: options.file,
    plugins: options.plugins,
    pluginPath: options.pluginPath,
  });
  if (!bundleData.length) {
    cliLogging.error('No valid bundle data was returned from the plugins specified');
    process.exit(1);
  }
  return bundleData;
}

// Dev command
addBuildOptions(program.command('dev'))
  .description('Start development server with hot module reloading')
  .option('-h, --hot', 'Use hot module reloading in the webpack devserver', false)
  .option('--port <port>', 'Set a port number to start devserver on', Number, 3000)
  .option('--host <host>', 'Set a host to serve devserver', String, '127.0.0.1')
  .option('--write-to-disk', 'Write files to disk instead of using webpack devserver', false)
  .option(
    '--watchonly [plugins...]',
    'An explicit comma separated list of plugins that should be watched - all others will be built once only',
    list,
    [],
  )
  .action(function (options) {
    validateKdsOptions(options);
    options.development = true;
    options.devServer = true;

    if (options.writeToDisk && options.hot) {
      cliLogging.error('Hot module reloading cannot be used with write-to-disk mode.');
      process.exit(1);
    }

    const bundleData = getBundleData(options);

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
        const unwatchedCompiler = createWebpackCompiler(unwatchedBundles, {
          ...options,
          cache: false,
          hot: false,
          development: true,
          devServer: false,
        });
        runProductionBuild(unwatchedCompiler);
      }
    }

    if (options.writeToDisk) {
      cliLogging.warn(
        'Enabling write-to-disk mode may fill up your developer machine with lots of different built files if frequent changes are made.',
      );
    }

    const compiler = createWebpackCompiler(bundleData, options);
    startDevServer(compiler, options);
  });

// Prod command
addBuildOptions(program.command('prod'))
  .description('Build optimized production assets')
  .option('--json', 'Output webpack stats in JSON format', false)
  .action(function (options) {
    validateKdsOptions(options);
    const bundleData = getBundleData(options);
    const compiler = createWebpackCompiler(bundleData, options);
    runProductionBuild(compiler, options);
  });

// Clean command
addBuildOptions(program.command('clean'))
  .description('Clean built assets')
  .action(function (options) {
    validateKdsOptions(options);
    const bundleData = getBundleData(options);
    clean(bundleData);
  });

// Compress
const compressCommand = program.command('compress');
compressCommand
  .arguments('[files...]', 'List of custom file globs or file names to compress')
  .allowUnknownOption()
  .action(function (files) {
    if (!files.length) {
      compressCommand.help();
    } else {
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

program.parse(process.argv);
