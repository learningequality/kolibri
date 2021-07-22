const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const sortBy = require('lodash/sortBy');
const glob = require('glob');
const recast = require('recast');
const traverse = require('ast-traverse');
const get = require('lodash/get');
const del = require('del');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const vueCompiler = require('vue-template-compiler');
const logging = require('../logging');
const { resolve } = require('../alias_import_resolver');
const { getVueSFCName } = require('./astUtils');

const GLOB = '/**/*.@(vue|js)';
const CONTEXT_LINE = '\n-- CONTEXT --\n';

// This function will clear the way for new CSV files to avoid any conflicts
function clearCsvPath(csvPath) {
  logging.info(`Removing existing messages files from ${csvPath}`);

  try {
    const removedFiles = del.sync(csvPath);
    logging.info(`Successfully cleared path for CSVs by removing: ${removedFiles.join('\n')}`);
  } catch (e) {
    logging.error('Failed to clear CSV path. Error message to follow...');
    logging.error(e);
  }
}

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

function processFiles(moduleFilePath, ignore) {
  const globPath = path.join(moduleFilePath, GLOB);
  logging.info(`Getting files from glob: ${globPath}`);
  const files = glob.sync(globPath, { ignore });
  logging.info('Processing ', files.length, ' files...');

  const messages = {};

  files.forEach(filePath => {
    const file = fs.readFileSync(filePath);

    // Conditionally vue-compile this if it's an SFC - this will give us easy accesst to the text
    // between the <script> tags in a Vue SFC
    let vueSFC;
    if (filePath.includes('.vue')) {
      vueSFC = vueCompiler.parseComponent(file.toString(), {
        preserveWhiteSpace: true,
        whitespace: 'preserve',
      });
    }

    // We want the SFC script content if it's an SFC, otherwise the file itself works
    const scriptContent = vueSFC ? get(vueSFC, 'script.content') : file;

    // At this point - if we basically don't have any JS to parse,
    // so we should let the user know and leave
    if (!scriptContent) {
      logging.error(
        `Tried to find parsable Javascript in ${filePath} but could not. Will skip the file for now. This is a problem if you are expecting to translate any messages in that file - otherwise - you may ignore this message.`
      );
      return;
    }

    // Finally! Do the extraction
    const ast = recast.parse(scriptContent, {
      parser: require('recast/parsers/babylon'),
      tabWidth: 2,
      reuseWhitespace: false,
    });
    Object.assign(messages, extract$trs(ast, filePath));
    Object.assign(messages, extractCreateTranslator(ast, filePath));
  });
  return messages;
}

// boolean check for if a node is where the $trs are defined in a Vue SFC
function is$trs(node) {
  return (
    node.type === 'ObjectProperty' &&
    node.key.name === '$trs' &&
    node.value.type === 'ObjectExpression'
  );
}

// boolean check if a node is a call of the fn 'createTranslator()'
function isCreateTranslator(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'createTranslator'
  );
}

// Returns { message, context } for a given node. We're getting the AST nodes
// of what was assigned to $trs or is a part of the object where messages are
// defined (what was passed as the 2nd arg to createTranslator())
//
// Also - this encapsulates the extraction of the data from 'ObjectProperty' nodes
function getObjectifiedValue(nodePropertyValue) {
  // If the value is not an object, then we'll make it into one to
  // have consistent data to work with (some will have an obj that
  // includes `context` key and value and some will have a string)
  if (nodePropertyValue.type !== 'ObjectExpression') {
    return { message: nodePropertyValue.value };
  } else {
    const contextNode = nodePropertyValue.properties.find(n => n.key.name === 'context');
    const messageNode = nodePropertyValue.properties.find(n => n.key.name === 'message');

    const message = stringFromAnyLiteral(messageNode.value);
    const context = stringFromAnyLiteral(contextNode.value);

    if (!message) {
      // This is mostly for dev debugging. If this happens then somethings wrong enough that
      // we should let the user know and just bail for now until it gets worked out
      logging.error(
        'Trying to get the message from an object in $trs but did not find a `message` key.\n\n',
        'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing. Sorry. Here is the node:\n\n',
        messageNode.value
      );
      process.exit(1);
    }

    return { message, context: `${CONTEXT_LINE}${context}` };
  }
}

// This function takes a node - a child of an object wherein messages were defined,
// and the ast of the source file and the path to that file.
//
// With this information, we reliably extract the runtime value of the key - even
// if it was given a name using an Identifier (variable) or
// MemberExpression (object.property eg Constants.video).
//
// This will follow imports and parse the ASTs of files found through following
// the imports. If we `import Constants from './constants'` - then we'll go to
// `./constants.js` - parse its AST and get the value that is used to key the message
//
// If an import is relative, that's easy to resolve.
//
// If an import is not relative, then we have to find matching paths in our globs
// which is where things get a little uncertain.
//
// TODO: This needs testing more than anything else. How to test it reliably though with
// regard to the imports - especially non-relative imports?!
//
// ARGS:
// node => Should be a node where strings were defined
// ast => Should be the whole ast of the file we're working on
// filePath => Path to the file from which the ast was generated
//
function getPropertyKey(node, ast, filePath) {
  var foundValue; // The key we're trying to get

  // This means the key given is the value of another object's property
  // like `[ConstantKeys.keyValue]: { ... message definition object ... }`
  if (node.key.type === 'MemberExpression') {
    // obj is the ConstantKeys in "ConstantKeys.keyValue" per the above example
    const obj = node.key.object.name;
    // prop is the keyValue in "ConstantKeys.keyValue" per the above example
    const prop = node.key.property.name;

    traverse(ast, {
      pre: node => {
        // See if we're finding where the variable was defined and if it has the key we want
        if (
          node.type === 'VariableDeclarator' &&
          // This node is where the variable we want is defined
          get(node, 'id.name') === obj
        ) {
          try {
            foundValue = stringFromAnyLiteral(
              get(node, 'init.properties').find(p => get(p, 'key.name') === prop)
            ).value;
          } catch (e) {
            logging.error(
              `Tried to get the value of ${obj}.${prop} from ${filePath} but failed.\n`,
              'This is an unrecoverable error.'
            );
            logging.error(e);
            process.exit(1);
          }
        }

        // Good chance we're using an external file - load it in and find the value given.
        // This code only runs if we find that the value of `obj` above is defined in an import
        // statement
        if (
          node.type === 'ImportDeclaration' &&
          get(node, 'specifiers', []).find(f => get(f, 'local.name') === obj)
        ) {
          const fileImportedFrom = get(node, 'source.value');

          const resolveAttempt = resolve(fileImportedFrom, filePath, { extensions: ['js', 'vue'] });

          if (!resolveAttempt.found) {
            logging.error(
              `Attempted to resolve an import in ${filePath} for module ${fileImportedFrom} but could not be resolved`
            );
            process.exit(1);
          }

          const targetFile = resolveAttempt.path;

          if (!targetFile) {
            logging.error(
              `A message's key was defined using the value of a variable imported from a JS file. I tried to find that file, but could not find ${fileImportedFrom} relative to ${filePath}.\n`,
              `${targetFile} does not exist\n`,
              `This is an unrecoverable error.`
            );
            process.exit(1);
          } else if (!fs.existsSync(targetFile)) {
            logging.error(
              `Tried to open ${targetFile} - which I got by resolving ${filePath} with ${fileImportedFrom} -- is it a non JS file? If so - how and why are you importing from it to get a value that you use to define a i18n message?\n`,
              `This is an unrecoverable error.`
            );
            process.exit(1);
          }

          const file = fs.readFileSync(targetFile);

          const importedAst = recast.parse(file, {
            parser: require('recast/parsers/babylon'),
            tabWidth: 2,
            reuseWhitespace: false,
          });

          // Remember - we're only here because we're looking for the value of an Object's property
          traverse(importedAst, {
            pre: node => {
              // See if we're finding where the variable was defined and if it has the key we want
              if (
                node.type === 'VariableDeclarator' &&
                // This node is where the variable we want is defined
                get(node, 'id.name') === obj
                // And it has a property with a key name of prop
                // (so we're sure this is the right object)
              ) {
                try {
                  foundValue = stringFromAnyLiteral(
                    get(node, 'init.properties').find(p => get(p, 'key.name') === prop).value
                  );
                } catch (e) {
                  logging.error(
                    `Tried to get the value of ${obj}.${prop} from ${filePath} but failed.\n`,
                    'This is an unrecoverable error.'
                  );
                  logging.error(e);
                  process.exit(1);
                }
              }
            },
          });

          // If we found the import defition, read the file and still have nothing,
          // show an error and leave
          if (!foundValue) {
            logging.error(
              `Tried to import ${targetFile} to find ${obj}.${prop} but could not extract the value.`
            );
            process.exit(1);
          }
        }
      },
    });
  } else if (node.computed) {
    // In this case - we're looking for a variable itself and it's defined in this file
    const varToken = node.key.name;
    // Need to find where this variable is defined and get its value
    traverse(ast, {
      pre: node => {
        if (node.type === 'VariableDeclarator' && get(node, 'id.name') === varToken) {
          foundValue = stringFromAnyLiteral(node.init);
        }
      },
    });
  }
  // Now - we've either found a value with all of the stuff above
  // OR we skipped it and we just need to get the node's name.
  //
  //
  // AST Fun Fact:
  // If the key has a space like "CC BY", it is located in `node.key.value`.
  // If the key has no spaces like "CC_BY", it is located in `node.key.name`.
  // (╯°□°)╯︵ ┻━┻
  return foundValue || node.key.name || node.key.value;
}

// Get the value we care about from a node that is type TemplateLiteral or StringLiteral
function stringFromAnyLiteral(node) {
  if (['TemplateLiteral', 'StringLiteral'].includes(node.type)) {
    return node.type === 'TemplateLiteral'
      ? get(node, 'quasis[0].value.raw')
      : get(node, 'value', null);
  } else {
    logging.error(
      'Tried to get string value from a node that is not a TemplateLiteral or a StringLiteral',
      '\n\n',
      node
    );
  }
}

function generateMessagesFromASTNode(messageNodeProperties, messageNamespace, ast, filePath) {
  const results = {};
  if (messageNodeProperties && messageNamespace) {
    // Now that we have the properties we care about, let's do the thing we're here to do!
    for (let $trProperty of messageNodeProperties) {
      results[
        `${messageNamespace}.${getPropertyKey($trProperty, ast, filePath)}`
      ] = getObjectifiedValue($trProperty.value);
    }
  }
  return results;
}

// This will pull out the defined messages accounting for $trs: {}
function extract$trs(ast, filePath) {
  // The name of the message namespace
  // For a Vue file, this is the component name, and will be the same
  // for all messages in a vue file.
  let messageNamespace;

  // To house the ast node for the definitions object
  // We currently only support one $trs occurrence per SFC file
  let messageNodeProperties;

  const nameSpaceFoundMsg = 'Namespace found!';
  try {
    traverse(ast, {
      pre: node => {
        messageNamespace = getVueSFCName(node);
        if (messageNamespace) {
          throw new Error(nameSpaceFoundMsg);
        }
      },
    });
  } catch (e) {
    if (e.message !== nameSpaceFoundMsg) {
      throw e;
    }
  }
  traverse(ast, {
    pre: node => {
      // If we find a $trs definition, we're in a Vue SFC and have found some defined messages
      if (is$trs(node)) {
        // We may run into a file with `$trs: {}` and we want to throw an error
        // if there are messages we want but are unable to get later on
        if (node.value.properties.length === 0) {
          logging.warn(`Skipping ${filePath} because $trs property was given an empty object`);
          return;
        }

        if (!messageNamespace) {
          logging.error(
            `I found $trs in ${filePath} but cannot get the name of the component. This is certainly a bug with the extraction.`
          );
          process.exit(1);
        }

        // Grab the definitions
        messageNodeProperties = node.value.properties;
      }
    },
  });

  return generateMessagesFromASTNode(messageNodeProperties, messageNamespace, ast, filePath);
}

// This will pull out the defined messages accounting for uses of createTranslator()
function extractCreateTranslator(ast, filePath) {
  const results = {};

  // Common logic for finding and extracting strings from the AST
  traverse(ast, {
    pre: node => {
      // The name of the message namespace
      // For a Vue file, this is the component name, and will be the same
      // for all messages in a vue file.
      // For a JS file, different Translator objects in the same file might have different
      // message namespaces, so we look for this on a node by node basis.
      let messageNamespace;

      // To house the ast node for the definitions object
      let messageNodeProperties;
      if (isCreateTranslator(node)) {
        // Handle the process of getting messages and message namespace
        // from a call to createTranslator()
        // The first argument is the message namespace,
        // the second is an object with message definitions
        // If the first item passed is an Identifier (variable token) then we need
        // to find it's definition and get it's value.
        if (node.arguments[0].type === 'Identifier') {
          // Get the name of the variable storing the string we want
          const messageNamespaceVarToken = node.arguments[0].name;
          // Find the node where that variable is defined, get the string we want from it
          traverse(ast, {
            pre: _node => {
              if (
                _node.type === 'VariableDeclarator' &&
                get(_node, 'id.name') === messageNamespaceVarToken &&
                ['StringLiteral', 'TemplateLiteral'].includes(_node.init.type)
              ) {
                messageNamespace = stringFromAnyLiteral(_node.init);
              }
            },
          });
        } else {
          // We were given a (String|Template)Literal as our first argument
          messageNamespace = stringFromAnyLiteral(node.arguments[0]);
        }

        // If it is an Identifier, that means createTranslator was given a variable of
        // string definitions, so we need to go looking for it with another traverse()
        if (node.arguments[1].type === 'Identifier') {
          // Get the name of the variable passed to createTranslator() so we can
          // try to find where it's defined in the first place
          const varToken = node.arguments[1].name;

          // Traverse from the start and find the value of the var passed to createTranslator()
          traverse(ast, {
            pre: _node => {
              // We want a variable declaration, with the same name as what was given
              // to createTranslator() - but it also must be assigned an Object
              if (
                _node.type === 'VariableDeclarator' &&
                get(_node, 'id.name') === varToken &&
                _node.init.type === 'ObjectExpression'
              ) {
                messageNodeProperties = _node.init.properties;
              }
            },
          });

          // We expect messageNodeProperties to have a value after this or we're going to bail.
          // Since we know we are in a createTranslator and we cannot find it's message definitions
          // then we should note that there is a problem here or in the code from which
          // we're extracting
          if (!messageNodeProperties) {
            logging.error(
              `Could not find variable called ${varToken} where strings for ${messageNamespace} should be defined.\n\n`,
              `This may be indicative of createTranslator's second argument being given as an empty object, which is pointless and therefore forbidden.`,
              'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing that might be in this code or your code and I cannot give you much more information than that. Continuing would mean some strings will be missed which would be unacceptable. Sorry.'
            );
            process.exit(1);
          }
        } else {
          // In this case, the second arg given is the object itself
          messageNodeProperties = node.arguments[1].properties;
        }
      }
      Object.assign(
        results,
        generateMessagesFromASTNode(messageNodeProperties, messageNamespace, ast, filePath)
      );
    },
  });
  return results;
}

// Transform the data into Crowdin-friendly CSV for upload and write the CSV
// This function will return a Promise
function toCSV(csvPath, namespace, messages) {
  // Here is the path to where we will write our CSVs
  // Let's be sure the path exists in the first place
  if (!fs.existsSync(csvPath)) {
    mkdirp.sync(csvPath);
  }

  const filePath = `${csvPath}/${namespace}-messages.csv`;

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

module.exports = function(dryRun, dump, pathInfo, ignore) {
  // An object for storing our messages.
  const extractedMessages = {};
  const localePaths = {};
  pathInfo.forEach(pathData => {
    const namespace = pathData.name;
    extractedMessages[namespace] = processFiles(pathData.moduleFilePath, ignore);
    localePaths[namespace] = path.join(
      path.dirname(path.dirname(pathData.localeFilePath)),
      'CSV_FILES',
      'en'
    );
  });

  if (!dryRun) {
    for (let csvPath of new Set(Object.values(localePaths))) {
      // Let's just get rid of the old files to limit room for issues w/ file system
      clearCsvPath(csvPath);
    }

    // Now we go through each namespace and write a CSV for it
    const PromisesToWriteCSVs = Object.keys(extractedMessages).map(namespace => {
      return toCSV(localePaths[namespace], namespace, extractedMessages[namespace]);
    });
    Promise.all(PromisesToWriteCSVs).then(() =>
      logging.info('Messages successfully written to CSV files.')
    );
  }

  let messageCount = 0;
  Object.keys(extractedMessages).forEach(
    ns => (messageCount += Object.keys(extractedMessages[ns]).length)
  );

  if (dump) {
    const timestamp = Math.floor(Date.now() / 1000);
    fs.writeFileSync(`extractedMessages-${timestamp}.json`, JSON.stringify(extractedMessages));
    logging.info(
      `--dump-extracted --> extractedMessages dumped to extractedMessages-${timestamp}.json`
    );
  }

  logging.info(`Successfully extracted ${messageCount} messages!`);
};
