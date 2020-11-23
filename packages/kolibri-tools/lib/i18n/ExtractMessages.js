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

const GLOB = '/**/*.@(vue|js)';
const CONTEXT_LINE = '\n-- CONTEXT --\n';

/*
 * Project Specific Paths & Processes
 *
 * Supported Projects
 * - Kolibri (https://github.com/learningequality/kolibri)
 * - Studio (https://github.com/learningequality/studio)
 *
 * This file must be modified if:
 *  - File structures change in the any supported projects
 *  - A new project wishes to be covered by this process
 *  - There is a change to how files define their i18n messages
 *
 * This block of code will setup paths specific to each supported
 * project and will define how their files are processed. These paths
 * will be used to determine which globs are processed
 *
 */

// Used to ensure we get the proper args from the user targeting a real project
const SUPPORTED_PROJECTS = ['kolibri', 'studio'];

// Kolibri paths
const KOLIBRI_ROOT = path.resolve('./kolibri');
const KOLIBRI_PLUGINS_PATHS = KOLIBRI_ROOT + '/plugins';
const KOLIBRI_CORE = KOLIBRI_ROOT + '/core';
// The CSV files for extraction go to the `en` folder. Other languages
// inside of that folder are what we download from Crowdin before converting to JSON
const KOLIBRI_CSV_PATH = KOLIBRI_ROOT + '/locale/CSV_FILES/en';

// Studio path
const STUDIO_ROOT = path.resolve('./contentcuration/contentcuration/frontend');
const STUDIO_CSV_PATH = path.resolve('./contentcuration/locale/CSV_FILES/en');

// Makes way for new CSVs to be written
function clearCsvPath() {
  const path = PROJECT === 'kolibri' ? KOLIBRI_CSV_PATH : STUDIO_CSV_PATH;

  logging.info(`Removing existing messages files from ${path}`);

  try {
    const removedFiles = del.sync(path);
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
 * 'namespace': In this context, we are referring to Django apps which house their own
 * frontend assets. Example: coach, device, etc
 *
 * 'messageKey': The key used to access the message. This is always associated with the name
 * of the name of the component it is defined in OR the name given to a `createTranslator`.
 * extractedMessages <object>: This is where we will store all of the found messages.
 *
 * ---
 *
 * The messages will be namespaced by which Django app they are found in. In Studio's
 * case, the `contentcuration` app is the only one. However, for Kolibri, each plugin
 * will result in its own namespace.
 *
 *
 * Each namespace then will be assigned to another object with the following format:
 *
 * <ComponentName.messageKey> : <messageObject>
 * PaginationComponent.nextButtonLabel : { message: "Next", context: "A button that says 'next'" }
 *
 *
 * The `context` field is optional.
 *
 * So the extractedMessages may look like:
 *
 * {
 *    coach: {
 *      CoachComponent.pageTitle: {
 *        message: "Coach component",
 *        context: "The title of the page",
 *      },
 *    },
 *    core: {
 *      CoreComponent.footerMessage: {
 *        message: "Copyright 2020",
 *      },
 *    }
 * }
 */

var extractedMessages = {};

var pluginsCount = 0;
function processFiles(files) {
  logging.info('Processing ', files.length, ' files');
  // For each file, read it and extract defined strings
  files.forEach(filePath => {
    if (filePath.includes('plugins')) {
      pluginsCount += 1;
    }
    // Skip node_modules
    if (filePath.includes('node_modules')) {
      return;
    }

    const namespace = getNamespace(filePath);

    const file = fs.readFileSync(filePath);

    // Conditionally compile this if it's an SFC
    let vueSFC;
    if (filePath.includes('.vue')) {
      vueSFC = vueCompiler.parseComponent(file.toString(), {
        preserveWhiteSpace: true,
        whitespace: 'preserve',
      });
    }

    // We want the SFC script content if it's an SFC, otherwise the file works
    const scriptContent = vueSFC ? get(vueSFC, 'script.content') : file;

    if (!scriptContent) {
      return;
    }

    extract$trs(scriptContent, namespace, filePath);
  });
}

function getNamespace(filePath) {
  return PROJECT === 'kolibri'
    ? _getKolibriNamespace(filePath)
    : // Studio has one namespace at the moment
      'contentcuration';
}

function _getKolibriNamespace(filePath) {
  if (filePath.includes('ClassAssignmentsPage')) {
    console.log('FOUND THE PAGE!!!');
  }
  return 'core';
  if (filePath.includes(KOLIBRI_PLUGINS_PATHS)) {
    try {
      // Split on the base path we know already exists - the 0th index is ''
      // but the 1st index is the rest of the path - the first dir in which
      // is what we're looking for.
      const pathAfterPlugins = filePath.split(KOLIBRI_PLUGINS_PATHS)[1];

      // Take the first index here because the string starts with '/' so
      // splitting it makes the 0th item an empty string
      const pluginName = pathAfterPlugins.split('/')[1];

      return pluginName;
    } catch (e) {
      logging.error('Could not find pluginName for path: ', filePath);
    }
  } else {
    return 'core';
  }
  /*
  // Work backward to get the first index of "plugins" in case
  // someone has a dir called "plugins" earlier in their absolute path
  const dirs = filePath.split("/").reverse();
  const pluginsDirIndex = dirs.indexOf('plugins');

  // If no "plugins" found, it's "core"
  if(pluginsDirIndex === -1) {
    return "core";
  } else {
    try {
      return dirs[pluginsDirIndex - 1];
    } catch(e) {
      logging.error(`Could not determine the plugin for ${filePath}.`);
      return null;
    }
  }
  */
}

function extract$trs(scriptString, namespace, filePath) {
  // Initialize the namespace in extractedMessages as an object if we haven't
  extractedMessages[namespace] = extractedMessages[namespace] || {};

  // Boolean check if a node is the definition of $trs in a Vue component.
  function is$trs(node) {
    return (
      node.type === 'ObjectProperty' &&
      node.key.name === '$trs' &&
      node.value.type === 'ObjectExpression'
    );
  }

  // Boolean check if a node is a call of the fn 'createTranslator()'
  function isCreateTranslator(node) {
    return (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'createTranslator'
    );
  }

  const ast = recast.parse(scriptString, {
    parser: require('recast/parsers/babylon'),
    tabWidth: 2,
    reuseWhitespace: false,
  });

  // component$trs will be used to store the currently processed file's definitions
  // We do this because we are using the AST to reliably glean the name of the
  // component we're extracting $trs from and it's *technically* possible, albeit
  // unlikely, that we will find $trs defined before we find the `name` property
  var component$trs;

  var componentName;

  // This is where we get the componentName from a vue file. JS files are handled
  // further along in the code because they're always defined in a createTranslator fn
  if (filePath.includes('.vue')) {
    const splitPath = filePath.split('/');
    const fileName = splitPath[splitPath.length - 1];
    componentName =
      fileName === 'index.vue'
        ? // If the filename is index, it's parent dir is the component name
          splitPath[splitPath.length - 2]
        : fileName.replace('.vue', '');
  }

  // Common logic for finding and extracting strings
  traverse(ast, {
    pre: node => {
      function _getObjectifiedValue(nodePropertyValue) {
        // If the value is not an object, then we'll make it into one to
        // have consistent data to work with (some will have an obj that
        // includes `context` key and value and some will have a string)
        // Also - this encapsulates the extraction of the data from 'ObjectProerty' nodes
        if (nodePropertyValue.type !== 'ObjectExpression') {
          return { message: nodePropertyValue.value };
        } else {
          const contextNode = nodePropertyValue.properties.find(n => n.key.name === 'context');
          const messageNode = nodePropertyValue.properties.find(n => n.key.name === 'message');

          const message =
            messageNode.value.type === 'TemplateLiteral'
              ? get(messageNode, 'value.quasis[0].value.raw')
              : get(messageNode, 'value.value', null);

          const context =
            contextNode.value.type === 'TemplateLiteral'
              ? get(contextNode, 'value.quasis[0].value.raw')
              : get(contextNode, 'value.value', '');

          if (!message) {
            // This is mostly for dev debugging. If this happens then somethings wrong enough that
            // we should let the user know and just bail for now until it gets worked out
            logging.error(
              'Trying to get the message from an object in $trs but did not find a `message` key.\n'
            );
            throw 'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing. Sorry.';
          }

          return { message, context: `${CONTEXT_LINE}${context}` };
        }
      }

      // If the key for a string has spaces like "CC BY" then the node keeps assigns that to
      // the node.key.value but if it has no spaces, it stores it in node.key.name
      function _getPropertyKey(node) {
        return node.key.name || node.key.value;
      }

      // Beginning to do the node processing here //

      if (is$trs(node)) {
        // component$trs is only relevant while we check for $trs definitions (Vue component)
        component$trs = {};

        node.value.properties.forEach($trProperty => {
          component$trs[_getPropertyKey($trProperty)] = _getObjectifiedValue($trProperty.value);
        });
      }

      if (isCreateTranslator(node)) {
        // We're given the "componentName' in this node's first arg.
        componentName = node.arguments[0].value;

        let messageNodeProperties;

        // If it is an Identifier, that means createTranslator was given a variable of
        // string definitions, so we need to go looking for it with another traverse()
        if (node.arguments[1].type === 'Identifier') {
          // Get the name of the variable passed to createTranslator() so we can
          // try to find where it's defined in the first place
          const varToken = node.arguments[1].name;

          // Inception Level 1
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
          // then we should bail. There is a problem here or in the code from which we're extracting
          if (!messageNodeProperties) {
            logging.error(
              `Could not find variable called ${varToken} where strings for ${namespace} should be defined.`
            );
            throw 'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing that might be in this code or your code and I cannot give you much more information than that. Continuing would mean some strings will be missed which would be unacceptable. Sorry.';
          }
        } else {
          // In this case, the second arg given is the object itself
          messageNodeProperties = node.arguments[1].properties;
        }

        //// TODO!!!!!!!!!!!!!!!!!!!!
        //
        //
        //
        // ----
        //
        // LIKE _ FIGURE IT OUT WHY IS js files not finding the stuff correctly
        //
        // Now that we have the properties we care about, let's do the thing we're here to do!
        messageNodeProperties.forEach($trProperty => {
          const newMessages = {
            [`${componentName}.${_getPropertyKey($trProperty)}`]: _getObjectifiedValue(
              $trProperty.value
            ),
          };
          Object.assign(extractedMessages[namespace], newMessages);
        });
      }
    },
  });

  // If component$trs and componentName are not undefined, then we found $trs
  // in there somewhere and need to add them to extractedMessages
  if (component$trs && componentName) {
    // component$trs is basically a copy of the $trs object on the component
    // so we need to ensure each key is like `ComponentName.key`
    const $trs = Object.keys(component$trs).reduce((acc, key) => {
      acc[`${componentName}.${key}`] = component$trs[key];
      return acc;
    }, {});

    Object.assign(extractedMessages[namespace], $trs);
  } else {
    //logging.info(`${filePath} - Found no strings.`, "\n", `component$trs: `, "\n", component$trs, 'componentName: ', "\n", componentName);
  }
}

// Translate the data into Crowdin-friendly CSV for upload and write the CSV
// Will return a promise
function toCSV(namespace, messages) {
  // Here is the path to where we will write our CSVs
  const pathPrefix = PROJECT === 'kolibri' ? KOLIBRI_CSV_PATH : STUDIO_CSV_PATH;
  // Let's be sure the path exists in the first place
  if (!fs.existsSync(pathPrefix)) {
    mkdirp.sync(pathPrefix);
  }

  const filePath = `${pathPrefix}/${namespace}-messages.csv`;

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

/*
 * CLI args handling.
 *
 * ARGS:
 *
 * --project=PROJECT: Used to determine which project we're working on.
 *
 * --dry-run: Will only run this file up to the point where we start extracting strings
 *            I found it useful for debugging.
 *
 */

var PROJECT;

try {
  PROJECT = process.argv.find(arg => arg.includes('--project=')).split('=')[1];
} catch (e) {
  logging.error(
    `Invalid value for --project flag: Please ensure that you've included the \`--project=<PROJECT>\` flag and that the <PROJECT> you entered is one of ${SUPPORTED_PROJECTS.map(
      e => `\`${e}\``
    ).join(' or ')}.`
  );
  process.exit(1);
}

if (!SUPPORTED_PROJECTS.includes(PROJECT.toLowerCase())) {
  logging.info(`Project ${PROJECT} is not supported. Please be sure`);
} else {
  logging.info(`Extracting messages for ${PROJECT}`);
}

/*
 * Where the magic happens (ENTRY POINT)
 */

// Only run if we didn't get the --dry-run flag
if (process.argv.indexOf('--dry-run') === -1) {
  // Setup the CSV path

  // Let's do it!
  switch (PROJECT) {
    case 'kolibri':
      logging.info(`Getting files from glob: ${KOLIBRI_CORE + GLOB}`);
      processFiles(glob.sync(KOLIBRI_CORE + GLOB, {}));
      logging.info(`Getting files from glob: ${KOLIBRI_PLUGINS_PATHS + GLOB}`);
      processFiles(glob.sync(KOLIBRI_PLUGINS_PATHS + GLOB, {}));
      break;
    case 'studio':
      processFiles(glob.sync(STUDIO_ROOT + GLOB, {}));
      break;
  }

  // Let's just get rid of the old files to avoid room for issues
  clearCsvPath();

  // Now we go through each namespace and write a CSV for it
  const PromisesToWriteCSVs = Object.keys(extractedMessages).map(namespace => {
    return toCSV(namespace, extractedMessages[namespace]);
  });

  let count = 0;
  Object.keys(extractedMessages).forEach(
    ns => (count += Object.keys(extractedMessages[ns]).length)
  );

  fs.writeFileSync('file.txt', JSON.stringify(extractedMessages));

  Promise.all(PromisesToWriteCSVs).then(() => logging.info('Message extraction is complete.'));
  console.log(count);
} else {
  logging.info('Dry Run Completed');
}
