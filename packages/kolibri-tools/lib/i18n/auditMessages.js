const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const logging = require('../logging');
const { getAllMessagesFromFilePath } = require('./astUtils');
const { checkForDuplicateIds, forEachPathInfo } = require('./utils');

// Instantiates the CSV data and writes to a file.
function writeAuditToCSV(audit, outputFile) {
  // Ensure we have a {localePath}/audit directory available.
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const csvWriter = createCsvWriter({
    path: outputFile,
    header: [
      { id: 'message', title: 'Message' },
      { id: 'missing', title: 'Missing?' },
      { id: 'duplicate', title: 'Duplicated?' },
      { id: 'messageIds', title: 'Message Ids' },
      { id: 'namespaces', title: 'Namespaces' },
    ],
  });
  csvWriter
    .writeRecords(
      audit.map(a => ({
        ...a,
        messageIds: a.messageIds.join(', '),
        namespaces: a.namespaces.join(', '),
      })),
    )
    .then(() => logging.log(`Audit CSV written to ${outputFile}`));
}

module.exports = function (pathInfo, ignore, dittoFilePaths, outputFile, verbose) {
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

  // All the strings we are interested in auditing, both ones from the ditto file
  // that are missing, and strings that are duplicated within the codebase.
  const outputStrings = [];

  const messageLookup = {};

  for (const namespace in extractedMessages) {
    for (const messageId in extractedMessages[namespace]) {
      if (!messageLookup[extractedMessages[namespace][messageId].message]) {
        messageLookup[extractedMessages[namespace][messageId].message] = {
          messageIds: [],
          namespaces: [],
          message: extractedMessages[namespace][messageId].message,
        };
      } else {
        const obj = messageLookup[extractedMessages[namespace][messageId].message];
        outputStrings.push({
          duplicate: true,
          missing: false,
          messageIds: obj.messageIds,
          namespaces: obj.namespaces,
          message: obj.message,
        });
      }
      const obj = messageLookup[extractedMessages[namespace][messageId].message];
      obj.messageIds.push(messageId);
      obj.namespaces.push(namespace);
    }
  }

  const dittoStrings = [];

  for (const dittoFilePath of dittoFilePaths) {
    const dittoFile = fs.readFileSync(dittoFilePath).toString();
    dittoStrings.push(...parse(dittoFile, { skip_empty_lines: true, columns: true }));
  }

  for (const dittoString of dittoStrings) {
    if (dittoString.Status === 'FINAL' && !messageLookup[dittoString.Text.trim()]) {
      outputStrings.push({
        duplicate: false,
        missing: true,
        messageIds: [],
        namespaces: [],
        message: dittoString.Text.trim(),
      });
    }
  }

  writeAuditToCSV(outputStrings, outputFile);
};
