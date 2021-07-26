const fs = require('fs');
const path = require('path');
const logging = require('../logging');
const { parseCSVDefinitions } = require('./utils');
const { getAllMessagesFromEntryFiles, getAllMessagesFromFilePath } = require('./astUtils');

module.exports = function(dryRun, pathInfo, ignore, langInfo, localeDataFolder) {
  const languageInfo = require(langInfo);
  // A map per webpack bundle designating which messages
  // are needed for full translation. Will be a map from:
  // name to an array of message ids of format namespace.key.
  const requiredMessages = {};
  for (let pathData of pathInfo) {
    const moduleFilePath = pathData.moduleFilePath;
    const name = pathData.name;
    logging.info(`Gathering required string ids for ${name}`);
    if (pathData.entry) {
      requiredMessages[name] = Object.keys(
        getAllMessagesFromEntryFiles(pathData.entry, moduleFilePath, ignore)
      );
    } else {
      requiredMessages[name] = Object.keys(getAllMessagesFromFilePath(moduleFilePath, ignore));
    }
    logging.info(`Gathered ${requiredMessages[name].length} required string ids for ${name}`);
  }
  for (let langObject of languageInfo) {
    const crowdinCode = langObject['crowdin_code'];
    const intlCode = langObject['intl_code'];
    logging.info(
      `Converting CSV files to JSON for crowdin code ${crowdinCode} / Intl code ${intlCode}`
    );
    const csvDefinitions = parseCSVDefinitions(localeDataFolder, crowdinCode);
    for (let name in requiredMessages) {
      // An object for storing our messages.
      const messages = {};
      for (let msg of requiredMessages[name]) {
        const definition = csvDefinitions.find(o => o['Identifier'] === msg);
        if (definition) {
          messages[msg] = definition['Translation'];
        } else {
          logging.error(`Could not find translation for message ${msg} in CSV files`);
        }
      }
      if (!dryRun) {
        fs.writeFileSync(
          path.join(localeDataFolder, name + '-messages.json'),
          // pretty print and sort keys
          JSON.stringify(messages, Object.keys(messages).sort(), 2)
        );
      }
    }
  }
};
