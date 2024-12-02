const fs = require('fs');
const path = require('path');
const traverse = require('ast-traverse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const reduce = require('lodash/reduce');
const get = require('lodash/get');
const isEqual = require('lodash/isEqual');
const vueCompiler = require('vue-template-compiler');
const logging = require('../logging');
const {
  getAllMessagesFromEntryFiles,
  getAllMessagesFromFilePath,
  getFilesFromFilePath,
  getFilesFromEntryFiles,
  getVueSFCName,
  getAstFromFile,
  parseAST,
} = require('./astUtils');
const { forEachPathInfo } = require('./utils');

// If you ever add a namespace here - you should also add that to the
// $TR_FUNCTIONS array in the vue-no-unused-translations eslint rule.
const COMMON_NAMESPACES = {
  coachString: 'CommonCoachStrings',
  coreString: 'CommonCoreStrings',
  learnString: 'CommonLearnStrings',
};

function logKeyError(namespace, key) {
  logging.warn(
    `No string found for '${namespace}.${key}' ` +
      '(either not defined, or the key was passed as a variable and not a string)',
  );
}

/* Utility Functions */

// Instantiates the CSV data and writes to a file.
function writeProfileToCSV(profile, outputFile) {
  // Ensure we have a {localePath}/profile directory available.
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const csvData = profileToCSV(profile);
  const csvWriter = createCsvWriter({
    path: outputFile,
    header: [
      { id: 'string', title: 'STRING' },
      { id: 'definition', title: 'DEFINITION?' },
      { id: 'namespace', title: 'NAMESPACE' },
      { id: 'key', title: 'KEY' },
      { id: 'common', title: 'COMMON?' },
      { id: 'pathname', title: 'PATHNAME' },
    ],
  });
  csvWriter.writeRecords(csvData).then(() => logging.log(`Profile CSV written to ${outputFile}`));
}

// Takes all data and processes it into rows of definitions followed by relevant uses.
function profileToCSV(profile) {
  return reduce(
    profile,
    (csv, data, $tr) => {
      const definitions = data.definitions;
      const uses = data.uses;
      const dataRows = [];
      definitions.forEach(def => {
        dataRows.push({
          string: $tr,
          definition: 'Yes',
          namespace: def.namespace,
          key: def.key,
          common: 'No',
        });
      });
      uses.forEach(use => {
        const newUse = {
          string: '',
          definition: 'No',
          namespace: use.namespace,
          key: use.key,
          common: use.common ? 'Yes' : 'No',
          pathname: use.parsedUrl,
        };
        if (!dataRows.some(use => isEqual(use, newUse))) {
          dataRows.push(newUse);
        }
      });
      csv = [...csv, ...dataRows];
      return csv;
    },
    [],
  );
}

/**
 *
 * @param {object} profile      - The given strProfile of string definitions and
 *                                previously profiled uses.
 * @param {string} namespace    - The namespace to query.
 * @param {string} key          - The key to query.
 * @param {bool} common         - Is the suspected use one of a Common string set?
 */
function getStringFromNamespaceKey(allMessages, namespace, key) {
  return get(allMessages, [`${namespace}.${key}`, 'message']);
}

// Given a node's array of arguments, extract and return the key... or null no dice.
function keyFromArguments(args, namespace) {
  let key = null;
  if (args && Array.isArray(args)) {
    if (args.length > 0) {
      if (args[0].type === 'StringLiteral') {
        key = args[0].value;
      }
    }
  }
  if (key === null) {
    logKeyError(namespace, key);
  }
  return key;
}

// Returns true if the string given is a *Common$tr
function isCommonFn(string) {
  return Object.keys(COMMON_NAMESPACES).includes(string);
}

/* Profiling Functions */
/**
 * The following functions contain all of the logic to process ASTs,
 * targeting the specific nodes that contain the data that we need.
 * It manipulates the profile passed to it with any new data - then
 * returns that profile.
 *
 * profileVueScript - parses Vue <script> content.
 * profileVueTemplate - parses Vue <template> content.
 * profileJSFile - parses JS files.
 */

function profileVueScript(profile, ast, pathname, namespace, allMessages) {
  let key;
  let common = false;
  try {
    traverse(ast, {
      pre: function (node) {
        // The CallExpressions will find all potential $tr and commont$tr calls.
        if (node.type === 'CallExpression') {
          if (node.callee.property) {
            if (node.callee.property.type === 'Identifier') {
              // node.arguments comes as an array - the first one in $tr and *Common$tr
              // is always the key.
              if (node.callee.property.name === '$tr') {
                key = keyFromArguments(node.arguments, namespace);
                common = false;
              }

              if (isCommonFn(node.callee.property.name)) {
                key = keyFromArguments(
                  node.arguments,
                  COMMON_NAMESPACES[node.callee.property.name],
                );
                common = true;
              }

              const currentNamespace = common
                ? COMMON_NAMESPACES[node.callee.property.name]
                : namespace;

              if (key && currentNamespace) {
                const $tring = getStringFromNamespaceKey(allMessages, currentNamespace, key);

                if ($tring) {
                  profile[$tring].uses.push({
                    namespace: currentNamespace,
                    key,
                    common,
                    parsedUrl: pathname,
                  });
                  key = null;
                } else {
                  logKeyError(currentNamespace, key);
                }
              }
            }
          }
        }
      },
    });
  } catch (e) {
    logging.error(e);
  }
  return profile;
}

function profileVueTemplate(profile, ast, pathname, namespace, allMessages) {
  let key;
  let common = false;
  try {
    traverse(ast, {
      pre: function (node) {
        // The CallExpressions will find all potential $tr and commont$tr calls.
        // NOTE: This differs from the above - this AST is conveniently slightly
        // different in structure - so there are not `property` objects here.
        if (node.type === 'CallExpression') {
          if (node.callee.type === 'Identifier') {
            // node.arguments comes as an array - the first one in $tr and *Common$tr
            // is always the key.
            if (node.callee.name === '$tr') {
              key = keyFromArguments(node.arguments, namespace);
              common = false;
            }
            if (isCommonFn(node.callee.name)) {
              key = keyFromArguments(node.arguments, COMMON_NAMESPACES[node.callee.name]);
              common = true;
            }

            const currentNamespace = common ? COMMON_NAMESPACES[node.callee.name] : namespace;

            if (key && currentNamespace) {
              const $tring = getStringFromNamespaceKey(allMessages, currentNamespace, key);

              if ($tring) {
                profile[$tring].uses.push({
                  namespace: currentNamespace,
                  key,
                  common,
                  parsedUrl: pathname,
                });
              }
              key = null;
            }
          }
        }
      },
    });
  } catch (e) {
    logging.error(e);
  }
  return profile;
}

function profileJSFile(profile, ast, pathname, allMessages) {
  const common = false;
  const varDeclarations = {};
  const $trUses = {};

  // Process the AST
  try {
    traverse(ast, {
      pre: function (node) {
        // Seek out any place where a createTranslator() function is called.
        if (node.type === 'VariableDeclarator') {
          if (node.init && node.init.type === 'CallExpression') {
            if (node.init.callee && node.init.callee.type === 'Identifier') {
              if (node.init.callee.name === 'createTranslator') {
                // Profile all variable declarations creating an instance of
                // createTranslator() storing the
                // key (variableName) => value (namespace)
                varDeclarations[node.id.name] = node.init.arguments[0].value;
              }
            }
          }
        }
        // Seek out all calls to $tr() - again storing the data using a key
        if (node.type === 'CallExpression') {
          if (node.callee && node.callee.type === 'MemberExpression') {
            if (node.callee.property && node.callee.property.name === '$tr') {
              if (node.arguments && node.arguments.length > 0) {
                const varName = node.callee.object.name;
                // Profile all $tr() calls (ie, uses of the key)
                // storing the key (variableName) => value (key)
                if (Object.keys($trUses).includes(varName)) {
                  $trUses[varName].push(node.arguments[0].value);
                } else {
                  $trUses[varName] = [node.arguments[0].value];
                }
              }
            }
          }
        }
      },
    });
  } catch (e) {
    logging.error(e);
  }
  // Merge the two collections of declarations and uses. Each object's
  // keys are declared variable names for instances of createTranslator().
  // varDeclarations stores variableName => namespace
  // $trUses stores variableName => [key1, key2, key3] (each key that was used)
  Object.keys(varDeclarations).forEach(variable => {
    const namespace = varDeclarations[variable];

    const uses = $trUses[variable];
    if (uses) {
      uses.forEach(key => {
        const message = getStringFromNamespaceKey(allMessages, namespace, key);
        if (namespace && key && message) {
          profile[message].uses.push({
            namespace,
            key,
            common,
            parsedUrl: pathname,
          });
        }
      });
    }
  });

  return profile;
}

function getVueTemplateAST(filePath) {
  const vueFile = fs.readFileSync(filePath);
  // Compile the <template>.
  const template = vueCompiler.compile(vueFile.toString(), {
    whitespace: 'preserve',
  });

  /**
   * The vueCompiler.compile() function returns an object including an anemic AST
   * and a property called `render` which has some stringified JS code.
   *
   * That code is what Vue would use to render the component - but it's wrapped in
   * a `with(this) {}` expression which returns an array of valid JS expressions in
   * an array.
   *
   * It's a string - which is what ast-traverse wants anyway - so we can strip the `with()`
   * altogether, leaving us with a stringified array containing everything we need to
   * create a thorough AST of the compiled Vue template.               *
   */
  const render = template.render.replace(/^.{18}|.{1}$/g, '');
  return parseAST(render);
}

module.exports = function (pathInfo, ignore, outputFile, verbose) {
  const allMessages = {};
  /**
   * An object where "Translation strings" are the keys.
   * Each key refers to another object with `definitions` and `uses`.
   *
   * `uses` stores all objects including all Namespace+Key combinations in which
   * that literal string of text is called upon as well as other related information.
   *
   */
  const definitions = {};
  forEachPathInfo(pathInfo, pathData => {
    const moduleFilePath = pathData.moduleFilePath;
    const name = pathData.name;
    logging.info(`Gathering string ids for ${name}`);
    let bundleMessages;
    if (pathData.entry) {
      bundleMessages = getAllMessagesFromEntryFiles(
        pathData.entry,
        moduleFilePath,
        ignore,
        verbose,
      );
    } else {
      bundleMessages = getAllMessagesFromFilePath(moduleFilePath, ignore, verbose);
    }
    for (const id in bundleMessages) {
      const message = bundleMessages[id]['message'];
      const [namespace, key] = id.split('.');
      if (!definitions[message]) {
        definitions[message] = { definitions: [], uses: [] };
      }
      definitions[message].definitions.push({
        namespace,
        key,
      });
    }
    Object.assign(allMessages, bundleMessages);
    logging.info(`Gathered ${Object.keys(bundleMessages).length} string ids for ${name}`);
  });
  logging.info(`Gathered ${Object.keys(definitions).length} unique strings`);
  forEachPathInfo(pathInfo, pathData => {
    const moduleFilePath = pathData.moduleFilePath;
    const name = pathData.name;
    logging.info(`Gathering string uses for ${name}`);
    let files;
    if (pathData.entry) {
      files = getFilesFromEntryFiles(pathData.entry, moduleFilePath, ignore);
    } else {
      files = getFilesFromFilePath(moduleFilePath, ignore);
    }
    for (const filePath of files) {
      const scriptAST = getAstFromFile(filePath);
      if (filePath.endsWith('.vue')) {
        const namespace = getVueSFCName(scriptAST);
        profileVueScript(definitions, scriptAST, filePath, namespace, allMessages);
        const templateAST = getVueTemplateAST(filePath);
        profileVueTemplate(definitions, templateAST, filePath, namespace, allMessages);
      } else if (filePath.endsWith('.js')) {
        profileJSFile(definitions, scriptAST, filePath, allMessages);
      }
    }
    logging.info(`Gathered string uses from ${files.size} files for ${name}`);
  });
  writeProfileToCSV(definitions, outputFile);
};
