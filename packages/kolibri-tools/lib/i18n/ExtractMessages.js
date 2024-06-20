const fs = require('fs');
const path = require('path');
const sortBy = require('lodash/sortBy');
const del = require('del');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const logging = require('../logging');
const { getAllMessagesFromFilePath } = require('./astUtils');
const { checkForDuplicateIds, forEachPathInfo } = require('./utils');

/*
 * Message Extraction
 *
 * Definitions:
 *
 * 'namespace': In this context, we are referring to Django apps / plugins which house their own
 * frontend assets. Example: coach, device, etc in Kolibri.
 *
 * 'messageKey': The key used to access the message. This is always associated with
 * of the name of the component it is defined in OR the name given to a `createTranslator`.
 * extractedMessages <object>: This is where we will store all of the found messages.
 *
 * ---
 *
 * The messages will be namespaced by which Django app they are found in. In Studio's
 * case, the `contentcuration` app is the only one. However, for Kolibri, each plugin
 * will result in its own namespace and, therefore, it's own CSV of message definitions
 *
 * Each namespace then will be assigned with another object with the following format:
 *
 * ```
 * <ComponentName.messageKey> : <messageObject>
 *
 * PaginationComponent.nextButtonLabel : { message: "Next", context: "A button that says 'Next'" }
 * ```
 *
 * The `context` field is optional.
 *
 * So the extractedMessages may look like:
 *
 * {
 *    // With context
 *    coach: {
 *      CoachComponent.pageTitle: {
 *        message: "Coach component",
 *        context: "The title of the page",
 *      },
 *    },
 *    // Without context
 *    core: {
 *      CoreComponent.footerMessage: {
 *        message: "Copyright 2020",
 *      },
 *    }
 * }
 */

// Transform the data into Crowdin-friendly CSV for upload and write the CSV
// This function will return a Promise
function toCSV(csvPath, namespace, messages) {
  // Here is the path to where we will write our CSVs
  // Let's be sure the path exists in the first place
  if (!fs.existsSync(csvPath)) {
    fs.mkdirSync(csvPath, { recursive: true });
  }

  const filePath = `${csvPath}/${namespace}-messages.csv`;

  // Let's just get rid of the old files to limit room for issues w/ file system
  logging.info(`Removing existing messages files from ${csvPath}`);

  try {
    const removedFiles = del.sync(filePath, { force: true });
    if (removedFiles)
      logging.info(`Successfully cleared path for CSVs by removing: ${removedFiles.join('\n')}`);
  } catch (e) {
    logging.error('Failed to clear CSV path. Error message to follow...');
    logging.error(e);
  }

  const csvWriter = createCsvWriter({
    path: filePath,
    // Getting into Crowdin's API
    header: [
      // Identifier == ComponentName.key
      { id: 'identifier', title: 'Identifier' },
      // Source String == The string defined
      { id: 'sourceString', title: 'Source String' },
      // Context, if any provided
      { id: 'context', title: 'Context' },
      // Translation (will be blank, but Crowdin wants it)
      { id: 'translation', title: 'Translation' },
    ],
  });

  const csvData = Object.keys(messages).map(identifier => {
    const sourceString = messages[identifier]['message'] || '';
    const context = messages[identifier]['context'] || '';

    return {
      identifier,
      sourceString,
      context,
      translation: '',
    };
  });

  // Finally - write the file! (returning a Promise here)
  return csvWriter.writeRecords(sortBy(csvData, 'identifier'));
}

module.exports = function (pathInfo, ignore, localeDataFolder, verbose) {
  // An object for storing our messages.
  const extractedMessages = {};
  forEachPathInfo(pathInfo, pathData => {
    const namespace = pathData.namespace;
    if (!extractedMessages[namespace]) {
      const filePathMessages = getAllMessagesFromFilePath(pathData.moduleFilePath, ignore, verbose);
      for (const otherNamespace in extractedMessages) {
        const nameSpaceMessages = extractedMessages[otherNamespace];
        if (checkForDuplicateIds(nameSpaceMessages, filePathMessages)) {
          logging.error(
            `Duplicate message ids across namespaces ${namespace} and ${otherNamespace}`,
          );
        }
      }
      extractedMessages[namespace] = filePathMessages;
    }
  });

  const csvPath = path.join(localeDataFolder, 'en', 'LC_MESSAGES');

  // Now we go through each namespace and write a CSV for it
  const PromisesToWriteCSVs = Object.keys(extractedMessages).map(namespace => {
    return toCSV(csvPath, namespace, extractedMessages[namespace]);
  });
  Promise.all(PromisesToWriteCSVs).then(() =>
    logging.info('Messages successfully written to CSV files.'),
  );

  let messageCount = 0;
  Object.keys(extractedMessages).forEach(
    ns => (messageCount += Object.keys(extractedMessages[ns]).length),
  );

  logging.info(`Successfully extracted ${messageCount} messages!`);
};
