const Table = require('cli-table');
const logger = require('../logging');
const { forEachPathInfo, parseCSVDefinitions } = require('./utils');
const { getAllMessagesFromEntryFiles, getAllMessagesFromFilePath } = require('./astUtils');

const logging = logger.getLogger('Kolibri Intl Data');

module.exports = function (pathInfo, ignore, langInfo, localeDataFolder, verbose) {
  const languageInfo = require(langInfo);
  // A map per webpack bundle designating which messages
  // are needed for full translation. Will be a map from:
  // name to an object of message ids to message object.
  const requiredMessages = {};
  forEachPathInfo(pathInfo, pathData => {
    const moduleFilePath = pathData.moduleFilePath;
    const name = pathData.name;
    if (pathData.entry) {
      requiredMessages[name] = getAllMessagesFromEntryFiles(
        pathData.entry,
        moduleFilePath,
        ignore,
        verbose,
      );
    } else {
      requiredMessages[name] = getAllMessagesFromFilePath(moduleFilePath, ignore, verbose);
    }
  });
  const table = new Table({
    head: ['Crowdin Code', 'Intl Code', '# Untranslated Messages', 'Untranslated Word Count'],
  });
  for (const langObject of languageInfo) {
    const crowdinCode = langObject['crowdin_code'];
    const intlCode = langObject['intl_code'];
    const csvDefinitions = parseCSVDefinitions(localeDataFolder, intlCode);
    // An object for storing missing messages.
    const missingMessages = {};
    for (const name in requiredMessages) {
      for (const msg in requiredMessages[name]) {
        const definition = csvDefinitions.find(o => o['Identifier'] === msg);
        if (!definition) {
          missingMessages[msg] = requiredMessages[name][msg]['message'];
        }
      }
    }
    const untranslatedWordCount = Object.values(missingMessages).reduce(
      (acc, message) => acc + message.split(' ').length,
      0,
    );
    table.push([crowdinCode, intlCode, Object.keys(missingMessages).length, untranslatedWordCount]);
  }
  logging.log(table.toString());
};
