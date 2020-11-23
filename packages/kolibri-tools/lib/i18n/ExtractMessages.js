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
 * HEY! Are you adding a product to be covered by this script? I've added some comments
 * with the characters NP (New Project) - search the file for them for some helpful hints
 * at what you need to do or add when making this work with another project
 */

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
 *  - There is a change to how files define their i18n messages, strings
 *    are not being extracted properly, etc
 *
 * This block of code will setup paths specific to each supported
 * project and will define how their files are processed. These paths
 * will be used to determine which globs are processed
 *
 */

// NP - Be sure you select a name for your project here and add it to this array
const SUPPORTED_PROJECTS = ['kolibri', 'studio'];

/* Kolibri */

// Base path to /home/you/code/kolibri/kolibri
const KOLIBRI_ROOT = path.resolve('./kolibri');
const KOLIBRI_PLUGINS_PATHS = KOLIBRI_ROOT + '/plugins';
const KOLIBRI_CORE = KOLIBRI_ROOT + '/core';
// The CSV files made from extraction will go to the `en` folder. Other languages
// inside of that folder are what we download from Crowdin before converting to JSON
const KOLIBRI_CSV_PATH = KOLIBRI_ROOT + '/locale/CSV_FILES/en';



/* Studio */

const STUDIO_ROOT = path.resolve('./contentcuration/contentcuration/frontend');
const STUDIO_CSV_PATH = path.resolve('./contentcuration/locale/CSV_FILES/en');

/*
 * NP - You'll want to add a *_ROOT path for your project - which is where this script will 
 * begin it's search for JS and Vue files to process. 
 *
 * Also, add a *_CSV_PATH which is where you expect this script's output to go.
 */

/* End Project Specific Setup */


/*
 * These functions will always return the paths for the current project
 * NP - Be sure to add cases to the switch statements here for filesPaths and csvPath 
 * functions
 */

function filesPaths() {
  switch(PROJECT) {
    case 'kolibri':
      return [KOLIBRI_CORE, KOLIBRI_PLUGINS_PATHS];
    case 'studio':
      return [STUDIO_ROOT];
    default:
      logging.error("Cannot give you filesPaths if there is no PROJECT set.");
  }
}

function csvPath() {
  switch(PROJECT) {
    case 'kolibri':
      return KOLIBRI_CSV_PATH;
    case 'studio':
      return STUDIO_CSV_PATH;
    default:
      logging.error("Cannot give you CSV path if there is no PROJECT set.");
  }
}

// This function will clear the way for new CSV files to avoid any conflicts
function clearCsvPath() {
  const path = PROJECT === 'kolibri' ? KOLIBRI_CSV_PATH : STUDIO_CSV_PATH;

  logging.log(`Removing existing messages files from ${path}`);

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

// A global object for storing our messages. Will Object.assign(extractedMessages, updates) for each 
// update to the values of this variable
var extractedMessages = {};
// We'll track Vue files with defined explicitly with empty objects in Vue files
var empty$trs = [];

// 
function processFiles(files) {
  logging.info('Processing ', files.length, ' files...');


  files.forEach(filePath => {
    // Skip node_modules
    if (filePath.includes('node_modules')) { return; }

    // We extract the namespace of the file we're working on from the file's path & read the file
    const namespace = getNamespace(filePath);

    // Using namespace, skip paths with `<namespace>/static` in the path
    if (filePath.includes(`${namespace}/static`)) { return; }

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

    // At this point - if we basically don't have any JS to parse, so we should let the user know and leave
    if (!scriptContent) {
      logging.error(`Tried to find parsable Javascript in ${filePath} but could not. Will skip the file for now. This is a problem if you are expecting to translate any messages in that file - otherwise - you may ignore this message.`);
      return;
    }

    // Finally! Do the extraction
    extract$trs(scriptContent, namespace, filePath);
  });
}

/*
 * Helper Functions
 */

// getNamespace abstracts the conditional logic for getting the namespace
// from the filePath. 
//
// NP - You'll need to account for your product's namespace here as well
function getNamespace(filePath) {
  return PROJECT === 'kolibri'
    ? _getKolibriNamespace(filePath)
    : // Studio has one namespace at the moment
      'contentcuration';
}


// For plugins we take the dir name right after the previously defined KOLIBRI_PLUGINS_PATHS 
// variable - otherwise return 'core'
function _getKolibriNamespace(filePath) {
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
    // Well if we're not messing with plugins we want `core`
    return 'core';
  }
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
// Also - this encapsulates the extraction of the data from 'ObjectProerty' nodes
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
    const context = stringFromAnyLiteral(contextNode.value)

    if (!message) {
      // This is mostly for dev debugging. If this happens then somethings wrong enough that
      // we should let the user know and just bail for now until it gets worked out
      logging.error(
        'Trying to get the message from an object in $trs but did not find a `message` key.\n\n',
        'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing. Sorry. Here is the node:\n\n',
        messageNode.value,
      );
      process.exit(1);
    }

    return { message, context: `${CONTEXT_LINE}${context}` };
  }
}

// If the key for a string has spaces like "CC BY" then the node assigns that to
// the node.key.value but if it has no spaces, it stores it in node.key.name. 
// AST parsing is fun!
function getPropertyKey(node) {
  return node.key.name || node.key.value;
}

// Get the value we care about from a node that is type TemplateLiteral or StringLiteral
function stringFromAnyLiteral(node) {
  if(['TemplateLiteral', 'StringLiteral'].includes(node.type)) {
    return node.type === 'TemplateLiteral'
        ? get(node, 'quasis[0].value.raw')
        : get(node, 'value', null);
  } else {
    logging.error("Tried to get string value from a node that is not a TemplateLiteral or a StringLiteral", "\n\n", node);
  }
}


// This will pull out the defined messages accounting for $trs: {} and uses of 
// createTranslator()
function extract$trs(scriptString, namespace, filePath) {
  // Initialize the namespace in extractedMessages as an object if we haven't
  extractedMessages[namespace] = extractedMessages[namespace] || {};

  const ast = recast.parse(scriptString, {
    parser: require('recast/parsers/babylon'),
    tabWidth: 2,
    reuseWhitespace: false,
  });

  var componentName; // The name of the component - which we'll find shortly

  // Common logic for finding and extracting strings from the AST
  traverse(ast, {
    pre: node => {
      // If we find a $trs definition, we're in a Vue SFC and have found some defined messages
      if (is$trs(node)) {
        // We may run into a file with `$trs: {}` and we want to throw an error if there are messages
        // we want but are unable to get later on
        if(node.value.properties.length === 0) {
          empty$trs.push(filePath);
          return;
        }
        // Get the component name from the path of the file
        const splitPath = filePath.split('/');
        const fileName = splitPath[splitPath.length - 1];
        componentName =
          fileName === 'index.vue'
            ? // If the filename is index, it's parent dir is the component name
              splitPath[splitPath.length - 2]
            : fileName.replace('.vue', '');

        if(!componentName) {
          logging.error(`I found $trs in ${filePath} but cannot get the name of the component. This is certainly a bug with the extraction.`)
          process.exit(1);
        }

        // Local keeper of definitions
        const component$trs = {};

        // Grab the definitions
        node.value.properties.forEach($trProperty => {
          component$trs[getPropertyKey($trProperty)] = getObjectifiedValue($trProperty.value);
        });
        
        // If component$trs and componentName are defined, then we found $trs
        // in there somewhere and need to add them to extractedMessages
        if (Object.keys(component$trs).length && componentName) {
          // component$trs is basically a copy of the $trs object on the component
          // so we need to reformat so that each key is like `ComponentName.key`
          const $trs = Object.keys(component$trs).reduce((acc, key) => {
            acc[`${componentName}.${key}`] = component$trs[key];
            return acc;
          }, {});

          Object.assign(extractedMessages[namespace], $trs);
        } else {
          logging.error(`Failed to extract messages from ${filePath}. This is like indicative of a bug in the message extraction - but is probably because you have strings defined in a way that has never been done before. Please review the strings defined in ${filePath} and include its contents in the issue you create at https://github.com/learningequality/kolibri/issues/new`);
          process.exit(1);          
        }
      }

      // Handle the process of getting definitions and component name from a call to createTranslator()
      // The first argument is the component name, the second is an object with message definitions
      if (isCreateTranslator(node)) {
        // If the first item passed is an Identifier (variable token) then we need
        // to find it's definition and get it's value.
        if(node.arguments[0].type === 'Identifier') {
          // Get the name of the variable storing the string we want
          const componentNameVarToken = node.arguments[0].name;
          // Find the node where that variable is defined, get the string we want from it
          traverse(ast, {
            pre: _node => {
              if(
                _node.type === 'VariableDeclarator' &&
                get(_node, 'id.name') === componentNameVarToken &&
                ['StringLiteral', 'TemplateLiteral'].includes(_node.init.type)
              ) {
                componentName = stringFromAnyLiteral(_node.init);
              }
            }
          });
        } else {
          // We were given a (String|Template)Literal as our first argument
          componentName = stringFromAnyLiteral(node.arguments[0]);
        }

        let messageNodeProperties; // To house the ast node for the definitions object

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
              `Could not find variable called ${varToken} where strings for ${namespace} should be defined.\n\n`,
              `This may be indicative of createTranslator's second argument being given as an empty object, which is pointless and therefore forbidden.`,
              'The above error is unrecoverable (✖╭╮✖). This indicates a bug that needs fixing that might be in this code or your code and I cannot give you much more information than that. Continuing would mean some strings will be missed which would be unacceptable. Sorry.'
            );
            process.exit(1);
          }
        } else {
          // In this case, the second arg given is the object itself
          messageNodeProperties = node.arguments[1].properties;
        }

        // Now that we have the properties we care about, let's do the thing we're here to do!
        messageNodeProperties.forEach($trProperty => {
          const newMessages = {
            [`${componentName}.${getPropertyKey($trProperty)}`]: getObjectifiedValue(
              $trProperty.value
            ),
          };
          Object.assign(extractedMessages[namespace], newMessages);
        });
      }
    },
  });
}

// Transform the data into Crowdin-friendly CSV for upload and write the CSV
// This function will return a Promise
function toCSV(namespace, messages) {
  // Here is the path to where we will write our CSVs
  // Let's be sure the path exists in the first place
  if (!fs.existsSync(csvPath())) {
    mkdirp.sync(csvPath());
  }

  const filePath = `${csvPath()}/${namespace}-messages.csv`;

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
 * Options:
 *
 * --project=PROJECT: Used to determine which project we're working on.
 *
 * --dry-run: Will only run this file up to the point where we start extracting strings
 *            I found it useful for debugging early on - may be useful for future iterations
 *            such as for adding new projects or other root-level changes in the code base
 *
 * --help or -h: Show help message
 */

var PROJECT, DRY_RUN, HELP;

// Just getting the few args we care about here. 
try {
  HELP = process.argv.find(arg => arg === "--help" || arg === "-h");
  // If we're asked for help then we'll just print the message and not run anything else
  if(!HELP) {
    DRY_RUN = process.argv.find(arg => arg === '--dry-run')
    DUMP = process.argv.find(arg => arg === '--dump-extracted');
    PROJECT = process.argv.find(arg => arg.includes('--project=')).split('=')[1];
  } else {
    logging.info(
      "\n\n== Kolibri Tools Frontend Message Extraction ==\n\n",
      "This script is intended to be run directly and is hard-coded to work for specific projects: ",
      SUPPORTED_PROJECTS.join(" and "),
      "\n\n",
      "Example: node ./path/to/kolibri-tools/lib/i18n/ExtractMessages.js --project=kolibri",
      "\n\n",
      "[Options]\n\n",
      "--project=<PROJECT> - (REQUIRED) <PROJECT> must be one of:",
      SUPPORTED_PROJECTS.join(" or "),
      "\n",
      "--dump-extracted - Will dump extractedMessages to a json file in the root where you ran this script. The file will be timestamped for uniqueness.",
      "\n",
      "--dry-run - Will not read or process any files. A minimally useful debugging assistant only left here because it was helpful to have while writing the script.",
      "\n",
      "--help or -h - Show this message.",
      "\n",
    );
    process.exit(0)
  }
} catch (e) {
  logging.error(
    `Invalid value for --project flag: Please ensure that you've included the \`--project=<PROJECT>\` flag and that the <PROJECT> you entered is one of ${SUPPORTED_PROJECTS.map(
      e => `\`${e}\``
    ).join(' or ')}.`
  );
  process.exit(9);
}

// Make sure we have a supported project given to us
if (!SUPPORTED_PROJECTS.includes(PROJECT.toLowerCase())) {
  logging.info(`Project ${PROJECT} is not supported. Supported project include only: ${SUPPORTED_PROJECTS.join(' or ')}`);
  process.exit(9);
} else {
  logging.info(`Extracting messages for ${PROJECT}`);
}

/*
 * Where the magic happens (ENTRY POINT) - Only run if we didn't get the --dry-run flag
 */

if (!DRY_RUN) {
  // filesPaths() returns the current project's paths where we will look for files
  // this code will load up extractedMessages with everything we want
  filesPaths().forEach(path => {
    logging.info(`Getting files from glob: ${path + GLOB}`);
    processFiles(glob.sync(path + GLOB, {}));
  });

  // Let's just get rid of the old files to limit room for issues w/ file system
  clearCsvPath();

  // Now we go through each namespace and write a CSV for it
  const PromisesToWriteCSVs = Object.keys(extractedMessages).map(namespace => {
    return toCSV(namespace, extractedMessages[namespace]);
  });

  if(empty$trs.length) {
    logging.log(`The following Vue files were skipped because their $trs property was given an empty object (I think) - this is pointless and should be removed: ${empty$trs.join("\n")}`);
  }

  let messageCount = 0;
  Object.keys(extractedMessages).forEach(
    ns => (messageCount += Object.keys(extractedMessages[ns]).length)
  );

  if(DUMP) {
    const timestamp = Math.floor(Date.now() / 1000);
    fs.writeFileSync(`extractedMessages-${timestamp}.json`, JSON.stringify(extractedMessages));
    logging.info(`--dump-extracted --> extractedMessages dumped to extractedMessages-${timestamp}.json`);
  }

  Promise.all(PromisesToWriteCSVs).then(() => logging.info('Message extraction is complete.'));
  logging.info(`Successfully extracted ${messageCount} messages!`);
} else {
  logging.info('Dry Run Completed');
}
