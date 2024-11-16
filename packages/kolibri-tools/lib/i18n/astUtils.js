const fs = require('fs');
const path = require('path');
const recast = require('recast');
const resolve = require('resolve');
const babylonParser = require('recast/parsers/babylon');
const traverse = require('ast-traverse');
const vueCompiler = require('vue-template-compiler');
const get = require('lodash/get');
const isPlainObject = require('lodash/isPlainObject');
const isString = require('lodash/isString');
const isArray = require('lodash/isArray');
const glob = require('../glob');
const logging = require('../logging');
const { CONTEXT_LINE } = require('./constants');
const { checkForDuplicateIds } = require('./utils');

function parseAST(scriptContent) {
  return recast.parse(scriptContent, {
    parser: babylonParser,
    tabWidth: 2,
    reuseWhitespace: false,
  });
}

function printAST(ast) {
  return recast.print(ast, { reuseWhitspace: false, tabWidth: 2, quote: 'single' }).code;
}

function getVueSFCName(ast) {
  let messageNamespace;

  const nameSpaceFoundMsg = 'Namespace found!';
  try {
    traverse(ast, {
      pre: node => {
        if (node.type === 'ObjectProperty') {
          if (node.key.name === 'name') {
            messageNamespace = node.value.value;
          }
        }
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
  return messageNamespace;
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

// Given a definition, return the value node for a StringLiteral
function stringLiteralNode(def) {
  return {
    type: 'StringLiteral',
    value: def['Source String'],
  };
}

// Given a definition, return the value node for a TemplateLiteral
function templateLiteralNode(def) {
  return {
    type: 'TemplateLiteral',
    quasis: [
      {
        type: 'TemplateElement',
        tail: true,
        value: {
          raw: def['Source String'],
          cooked: def['Source String'],
        },
      },
    ],
    expressions: [],
  };
}

// Given the defined context string, return it without the appended identifier
function extractContext(context) {
  const splitContext = context.split(CONTEXT_LINE);
  return splitContext[splitContext.length - 1];
}

// Get the value we care about from a node that is type TemplateLiteral or StringLiteral
function stringFromAnyLiteral(node) {
  if (node.type === 'ObjectProperty') {
    return stringFromAnyLiteral(node.value);
  }
  if (['TemplateLiteral', 'StringLiteral', 'Literal'].includes(get(node, 'type'))) {
    return node.type === 'TemplateLiteral'
      ? get(node, 'quasis[0].value.raw')
      : get(node, 'value', null);
  } else if (node.type === 'BinaryExpression') {
    const left = stringFromAnyLiteral(node.left);
    const right = stringFromAnyLiteral(node.right);
    return left + right;
  } else {
    logging.error(
      'Tried to get string value from a node that is not a Literal, TemplateLiteral or a StringLiteral',
      '\n\n',
      get(node, 'init.properties[0].key.name', ''),
    );
  }
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
  let message, context;
  if (nodePropertyValue.type !== 'ObjectExpression') {
    message = stringFromAnyLiteral(nodePropertyValue);
    context = '';
  } else {
    const contextNode = get(nodePropertyValue, 'properties', []).find(
      n => n.key.name === 'context',
    );
    const messageNode = get(nodePropertyValue, 'properties', []).find(
      n => n.key.name === 'message',
    );

    if (!messageNode) {
      // This is mostly for dev debugging. If this happens then somethings wrong enough that
      // we should let the user know and just bail for now until it gets worked out
      throw new ReferenceError(
        'Trying to get the message from an object in $trs but did not find a `message` key.\n' +
          'Available keys on the message object include:\n' +
          get(nodePropertyValue, 'properties', [])
            .map(p => p.key.name)
            .join(', '),
      );
    }

    message = stringFromAnyLiteral(messageNode);
    try {
      context = stringFromAnyLiteral(contextNode);
    } catch (e) {
      context = '';
    }
  }
  if (!message) {
    // This is mostly for dev debugging. If this happens then somethings wrong enough that
    // we should let the user know and just bail for now until it gets worked out
    throw new ReferenceError(
      'Trying to get the message from an object in $trs but did not find a `message` key.\n\n' +
      'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing. Sorry.' +
      nodePropertyValue.properties
        ? nodePropertyValue.properties[0].value.value
        : nodePropertyValue.value,
    );
  }
  return { message, context: `${CONTEXT_LINE}${context}` };
}

function getFileNameForImport(importPath, filePath) {
  const extensions = ['.js', '.vue'];
  const resolveAttempt = resolve(importPath, filePath, { extensions });

  if (
    !resolveAttempt.found ||
    !extensions.some(ext => resolveAttempt.path && resolveAttempt.path.endsWith(ext))
  ) {
    // Just throw up here if we don't have another worthy attempt
    throw new ReferenceError(
      `Attempted to resolve an import in ${filePath} for module ${importPath} but could not be resolved as a Javascript or Vue file`,
    );
  }
  return resolveAttempt.path;
}

function getImportFileNames(filePath, ignore) {
  const fileNames = [];
  const ast = getAstFromFile(filePath);
  if (ast) {
    traverse(ast, {
      pre: astNode => {
        if (
          astNode.type === 'ImportDeclaration' ||
          astNode.type === 'ExportNamedDeclaration' ||
          astNode.type === 'ExportAllDeclaration'
        ) {
          const fileImportedFrom = get(astNode, 'source.value');
          if (fileImportedFrom) {
            try {
              const targetFile = getFileNameForImport(fileImportedFrom, filePath);
              // Don't return files that we are meant to ignore
              const filterFiles = glob.sync(targetFile, { ignore });
              if (filterFiles.length) {
                fileNames.push(targetFile);
              }
            } catch (e) {} // eslint-disable-line no-empty
          }
        }
      },
    });
  }
  return fileNames;
}
/*
 * This function takes a node - a child of an object wherein messages were defined,
 * and the ast of the source file and the path to that file.
 *
 * With this information, we reliably extract the runtime value of the key - even
 * if it was given a name using an Identifier (variable) or
 * MemberExpression (object.property eg Constants.video).
 *
 * This will follow imports and parse the ASTs of files found through following
 * the imports. If we `import Constants from './constants'` - then we'll go to
 * `./constants.js` - parse its AST and get the value that is used to key the message
 *
 * This uses our alias import resolver to handle this, so it should handle any valid
 * import in Kolibri code, including our webpack aliases.
 *
 * @param {Object} node An estree node whose property we want to get the literal value for
 * @param {Object} ast An estree ast of the file we're working on
 * @param {string} filePath Path to the file from which the ast was generated
 * @returns {string} the literal string value
 */
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
      pre: astNode => {
        // See if we're finding where the variable was defined and if it has the key we want
        if (
          astNode.type === 'VariableDeclarator' &&
          // This node is where the variable we want is defined
          get(astNode, 'id.name') === obj
        ) {
          try {
            foundValue = stringFromAnyLiteral(
              get(astNode, 'init.properties', []).find(p => get(p, 'key.name') === prop),
            );
          } catch (e) {
            logging.error(
              `Tried to get the value of ${obj}.${prop} from ${filePath} but failed.\n`,
              'This is an unrecoverable error.',
            );
            logging.error(e);
            process.exit(1);
          }
        }

        // Good chance we're using an external file - load it in and find the value given.
        // This code only runs if we find that the value of `obj` above is defined in an import
        // statement
        if (
          astNode.type === 'ImportDeclaration' &&
          get(astNode, 'specifiers', []).find(f => get(f, 'local.name') === obj)
        ) {
          const fileImportedFrom = get(astNode, 'source.value');

          let targetFile;

          try {
            targetFile = getFileNameForImport(fileImportedFrom, filePath);
          } catch (e) {
            logging.error(
              "A message's key was defined using the value of a variable imported from a JS file.",
            );
            logging.error(e);
            process.exit(1);
          }

          const file = fs.readFileSync(targetFile);

          const importedAst = parseAST(file);

          // Remember - we're only here because we're looking for the value of an Object's property
          traverse(importedAst, {
            pre: importedNode => {
              // See if we're finding where the variable was defined and if it has the key we want
              if (
                importedNode.type === 'VariableDeclarator' &&
                // This node is where the variable we want is defined
                get(importedNode, 'id.name') === obj
                // And it has a property with a key name of prop
                // (so we're sure this is the right object)
              ) {
                try {
                  foundValue = stringFromAnyLiteral(
                    // get the matching property's `value` (a node) to give to stringFromAnyLiteral
                    get(importedNode, 'init.properties', []).find(p => get(p, 'key.name') === prop)
                      .value,
                  );
                } catch (e) {
                  logging.error(
                    `Tried to get the value of ${obj}.${prop} from ${filePath} but failed.\n`,
                    'This is an unrecoverable error.',
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
              `Tried to import ${targetFile} to find ${obj}.${prop} but could not extract the value.`,
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

function generateMessagesFromASTNode(messageNodeProperties, messageNamespace, ast, filePath) {
  const results = {};
  if (messageNodeProperties && messageNamespace) {
    // Now that we have the properties we care about, let's do the thing we're here to do!
    for (const $trProperty of messageNodeProperties) {
      const messageId = `${messageNamespace}.${getPropertyKey($trProperty, ast, filePath)}`;
      try {
        results[messageId] = getObjectifiedValue($trProperty.value);
      } catch (e) {
        logging.error('Issue in file: ', filePath);
        logging.error('Could not extract message from: ', messageId);
        logging.error(e);
        process.exit(1);
      }
    }
  }
  return results;
}

// This will pull out the defined messages accounting for $trs: {}
function extract$trs(ast, filePath) {
  // The name of the message namespace
  // For a Vue file, this is the component name, and will be the same
  // for all messages in a vue file.
  const messageNamespace = getVueSFCName(ast);

  // To house the ast node for the definitions object
  // We currently only support one $trs occurrence per SFC file
  let messageNodeProperties;

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
            `I found $trs in ${filePath} but cannot get the name of the component. This is certainly a bug with the extraction.`,
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
              'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing that might be in this code or your code and I cannot give you much more information than that. Continuing would mean some strings will be missed which would be unacceptable. Sorry.',
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
        generateMessagesFromASTNode(messageNodeProperties, messageNamespace, ast, filePath),
      );
    },
  });
  return results;
}

function getAstFromFile(filePath) {
  const file = fs.readFileSync(filePath);

  // Conditionally vue-compile this if it's an SFC - this will give us easy access to the text
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
    return;
  }

  // Finally! Do the extraction
  return parseAST(scriptContent);
}

const GLOB = '/**/*.@(vue|js)';

function getFilesFromFilePath(moduleFilePath, ignore) {
  const globPath = path.join(moduleFilePath, GLOB);
  logging.info(`Getting files from glob: ${globPath}`);
  return glob.sync(globPath, { ignore });
}

function getAllMessagesFromFilePath(moduleFilePath, ignore, verbose) {
  const files = getFilesFromFilePath(moduleFilePath, ignore);
  logging.info('Processing ', files.length, ' files...');
  const messages = {};

  files.forEach(filePath => {
    const extractedMessages = getMessagesFromFile(filePath, verbose);
    if (checkForDuplicateIds(messages, extractedMessages)) {
      logging.error(`Duplicate message ids across files in ${moduleFilePath}`);
    }
    Object.assign(messages, extractedMessages);
  });
  return messages;
}

function recurseForStrings(entryFile, ignore, visited, verbose) {
  const outputStrings = {};
  if (!visited.has(entryFile)) {
    Object.assign(outputStrings, getMessagesFromFile(entryFile, verbose));
    for (const filePath of getImportFileNames(entryFile, ignore)) {
      const extractedMessages = recurseForStrings(filePath, ignore, visited, verbose);
      if (checkForDuplicateIds(outputStrings, extractedMessages)) {
        logging.error(`Duplicate message ids found in imports for ${entryFile}`);
      }
      Object.assign(outputStrings, extractedMessages);
    }
    visited.add(entryFile);
  }
  return outputStrings;
}

function _validateEntryFiles(entryFiles) {
  if (isString(entryFiles)) {
    entryFiles = [entryFiles];
  } else if (isPlainObject(entryFiles)) {
    entryFiles = Object.values(entryFiles);
  } else if (!isArray(entryFiles)) {
    throw new TypeError('Invalid type for entry files');
  }
  return entryFiles;
}

function getAllMessagesFromEntryFiles(entryFiles, moduleFilePath, ignore, verbose) {
  entryFiles = _validateEntryFiles(entryFiles);
  const visited = new Set();
  return entryFiles.reduce((acc, entryFile) => {
    try {
      const filePath = getFileNameForImport(path.join(moduleFilePath, entryFile), '/');
      const fileMessages = recurseForStrings(filePath, ignore, visited, verbose);
      if (checkForDuplicateIds(acc, fileMessages)) {
        logging.error(`Duplicate message ids across entry files in ${moduleFilePath}`);
      }
      return Object.assign(acc, fileMessages);
    } catch (e) {
      return acc;
    }
  }, {});
}

function getFilesFromEntryFiles(entryFiles, moduleFilePath, ignore) {
  entryFiles = _validateEntryFiles(entryFiles);
  const visited = new Set();
  entryFiles.map(entryFile => {
    try {
      const filePath = getFileNameForImport(path.join(moduleFilePath, entryFile), '/');
      recurseForStrings(filePath, ignore, visited);
    } catch (e) {} // eslint-disable-line no-empty
  });
  return visited;
}

function getMessagesFromFile(filePath, verbose = false) {
  const messages = {};
  try {
    const ast = getAstFromFile(filePath);

    // At this point - if we basically don't have any JS to parse,
    // so we should let the user know and leave
    if (!ast) {
      throw new Error('No AST created');
    }

    Object.assign(messages, extract$trs(ast, filePath));
    const translatorMessages = extractCreateTranslator(ast, filePath);
    if (checkForDuplicateIds(messages, translatorMessages)) {
      logging.error(`Duplicate message ids within the file ${filePath}`);
    }
    Object.assign(messages, translatorMessages);
    if (verbose) {
      logging.info(`Extracted ${Object.keys(messages).length} messages from  :: ${filePath}`);
      logging.info(JSON.stringify(messages));
    }
  } catch (_) {
    logging.error(
      `Tried to find parsable Javascript in ${filePath} but could not. Will skip the file for now. This is a problem if you are expecting to translate any messages in that file - otherwise - you may ignore this message.`,
    );
  }
  return messages;
}

module.exports = {
  getFilesFromFilePath,
  getFilesFromEntryFiles,
  getAllMessagesFromFilePath,
  getAllMessagesFromEntryFiles,
  getMessagesFromFile,
  getFileNameForImport,
  getImportFileNames,
  getVueSFCName,
  getAstFromFile,
  parseAST,
  printAST,
  is$trs,
  isCreateTranslator,
  stringLiteralNode,
  templateLiteralNode,
  extractContext,
};
