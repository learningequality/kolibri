#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { Command } = require('commander');
const ini = require('ini');
const toml = require('smol-toml');
const get = require('lodash/get');
const webpack = require('webpack');
const logger = require('kolibri-logging');
const { kolibriName, readWebpackJson } = require('kolibri-build');
const version = require('../package.json');

// Import all the i18n modules
const intlCodeGen = require('./intl_code_gen');
const extractMessages = require('./ExtractMessages');
const syncContext = require('./SyncContext');
const csvToJSON = require('./csvToJSON');
const untranslatedMessages = require('./untranslatedMessages');
const profileStrings = require('./ProfileStrings');
const auditStrings = require('./auditMessages');
const { stripEnLcMessages } = require('./utils');

const cliLogging = logger.getLogger('Kolibri I18N CLI');

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

program.version(version.version).description('Internationalization tools for Kolibri');

const ignoreDefaults = ['**/node_modules/**', '**/static/**'];

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
    : path.join(__dirname, './language_info.json');

// I18N Intl and Vue-Intl Polyfill Code Generation
program
  .command('code-gen')
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
        const isCoreBundle =
          buildConfig.webpack_config.output &&
          buildConfig.webpack_config.output.library === kolibriName;
        return {
          moduleFilePath: bundle.plugin_path,
          namespace: bundle.module_path,
          name: bundle.name,
          entry,
          aliases,
          isCoreBundle,
          // webpack_json.py appends `en/LC_MESSAGES`; strip it back to the base
          // locale dir so each bundle's strings route to its own folder.
          localeDataFolder: stripEnLcMessages(bundle.locale_data_folder),
        };
      }),
    );
  }
  if (namespace.length && namespace.length == searchPath.length) {
    let aliases;
    if (webpackConfig) {
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
const i18nExtractMessagesCommand = program.command('extract-messages');
_addPathOptions(i18nExtractMessagesCommand).action(function (options) {
  const pathInfo = _generatePathInfo(options);
  if (!pathInfo) {
    i18nExtractMessagesCommand.help();
  }
  extractMessages(pathInfo, options.ignore, options.localeDataFolder, options.verbose);
});

const i18nTransferContextCommand = program.command('transfer-context');
_addPathOptions(i18nTransferContextCommand).action(function (options) {
  const pathInfo = _generatePathInfo(options);
  if (!pathInfo) {
    i18nTransferContextCommand.help();
  }
  syncContext(pathInfo, options.ignore, options.localeDataFolder, options.verbose);
});

// I18N Create runtime message files
const i18nCreateMessageFilesCommand = program.command('create-message-files');
_addPathOptions(i18nCreateMessageFilesCommand)
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault,
  )
  .action(function (options) {
    const pathInfo = _generatePathInfo(options);
    if (!pathInfo) {
      i18nCreateMessageFilesCommand.help();
    }
    csvToJSON(
      pathInfo,
      options.ignore,
      options.langInfo,
      options.localeDataFolder,
      options.verbose,
    );
  });

// I18N Untranslated, used messages
const i18nUntranslatedMessagesCommand = program.command('untranslated-messages');
_addPathOptions(i18nUntranslatedMessagesCommand)
  .option(
    '--lang-info <langInfo>',
    'Set path for file that contains language information',
    filePath,
    langInfoDefault,
  )
  .action(function (options) {
    const pathInfo = _generatePathInfo(options);
    if (!pathInfo) {
      i18nUntranslatedMessagesCommand.help();
    }
    untranslatedMessages(
      pathInfo,
      options.ignore,
      options.langInfo,
      options.localeDataFolder,
      options.verbose,
    );
  });

// I18N Profile
const i18nProfileCommand = program.command('profile');
_addPathOptions(i18nProfileCommand)
  .option(
    '--output-file <outputFile>',
    'File path and name to which to write out the profile to',
    filePath,
  )
  .action(function (options) {
    const pathInfo = _generatePathInfo(options);
    if (!pathInfo) {
      i18nProfileCommand.help();
    }
    profileStrings(pathInfo, options.ignore, options.outputFile, options.verbose);
  });

// I18N Ditto Audit
const i18nAuditCommand = program.command('audit');
_addPathOptions(i18nAuditCommand)
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
      i18nAuditCommand.help();
    }
    auditStrings(
      pathInfo,
      options.ignore,
      [options.dittoFile],
      options.outputFile,
      options.verbose,
    );
  });

program.parse(process.argv);
