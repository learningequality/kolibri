const fs = require('fs');
const path = require('path');
const url = require('url');
const mkdirp = require('mkdirp');
const espree = require('espree');
const traverse = require('ast-traverse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const reduce = require('lodash/reduce');
const isEqual = require('lodash/isEqual');
const vueCompiler = require('vue-template-compiler');
const logging = require('./logging');

const PROFILES_FOLDER = 'profiles';

// If you ever add a namespace here - you should also add that to the
// $TR_FUNCTIONS array in the vue-no-unused-translations eslint rule.
const COMMON_NAMESPACES = {
  coachString: 'CommonCoachStrings',
  coreString: 'CommonCoreStrings',
  learnString: 'CommonLearnStrings',
};

function ProfileStrings(localePath, moduleName) {
  this.localePath = localePath;
  this.moduleName = moduleName;
}

function logKeyError(namespace, key) {
  logging.log(
    `No string found for '${namespace}.${key}' ` +
      '(either not defined, or the key was passed as a variable and not a string)'
  );
}

/* Webpack Entry */
ProfileStrings.prototype.apply = function(compiler) {
  const self = this;

  // Only works in non-production mode.
  if (process.env.NODE_ENV !== 'production') {
    compiler.hooks.emit.tapAsync('profileStrings', function(compilation, callback) {
      let strProfile = getStringDefinitions(self.localePath, self.moduleName);

      // Not all modules have messages files - bail if we don't get one.
      if (!strProfile) {
        callback();
        return;
      }

      compilation.chunks.forEach(chunk => {
        let parsedUrl;
        let ast;

        // Walk through the modules being given to us in compilation.
        for (const module of chunk.modulesIterable) {
          parsedUrl = module.resource && url.parse(module.resource);

          // Processing Vue files only here.
          if (urlIsVue(parsedUrl, module)) {
            // module._source.source() returns the part of the Vue file between the
            // <script> tags only - will not parse the <template> tag content at all.
            ast = espree.parse(module._source.source(), {
              sourceType: 'module',
              ecmaVersion: 2018,
            });
            strProfile = profileVueScript(strProfile, ast, parsedUrl.pathname, self.moduleName);

            if (parsedUrl.pathname) {
              // If we have a pathname - which ostensibly points to a Vue file - we
              // can now parse the <template> portion of the Vue file.
              const vueFile = fs.readFileSync(parsedUrl.pathname);
              // Compile the <template>.
              const template = vueCompiler.compile(vueFile.toString(), {
                whitespace: 'condense',
              });

              /**
               * The vueCompiler.compile() function returns an object including an anemic AST
               * and a property called `render` which has some stringified JS code.
               *
               * That code is what Vue would use to render the component - but it's wrapped in
               * a `with(this) {}` expression which returns an array of valid JS expressions in
               * an array.
               *
               * It's a string - which is what espree wants anyway - so we can strip the `with()`
               * altogether, leaving us with a stringified array containing everything we need to
               * create a thorough AST of the compiled Vue template.               *
               */
              const render = template.render.replace(/^.{18}|.{1}$/g, '');
              ast = espree.parse(render, {
                ecmaVersion: '2018',
                sourceType: 'module',
                ecmaFeatures: { jsx: true, templateStrings: true },
              });

              strProfile = profileVueTemplate(strProfile, ast, parsedUrl.pathname, self.moduleName);
            }
          }

          // Processing *.js files now
          if (urlIsJS(module)) {
            ast = espree.parse(module._source.source(), {
              sourceType: 'module',
            });

            strProfile = profileJSFile(strProfile, ast, parsedUrl.pathname, self.moduleName);
          }
        }
      });
      // Write this module out to CSV.
      writeProfileToCSV(strProfile, self.moduleName, self.localePath);
      // Also dump the JSON profiles so that we can easily combine data.
      fs.writeFileSync(
        `${self.localePath}/${PROFILES_FOLDER}/${self.moduleName}.json`,
        JSON.stringify(strProfile)
      );
      callback();
    });
  }
}; // End AST Parsing and Webpack processing.

/* Utility Functions */

/**
 * Returns an object where "Translation strings" are the keys.
 * Each key refers to another object with `definitions` and `uses`.
 *
 * This function instantiates the `definitions` data by reading all of the
 * strings, namespaces and keys from the given module's *-messages.json file.
 *
 * `definitions` stores an array of objects storing Namespace & Key combinations
 * which specifically refer to the string used as it's key.
 *
 * This function returns an emtpy array for each of the `uses` keys - saving
 * us from having to check if it's there or not later while parsing the code.
 *
 * `uses` stores all objects including all Namespace+Key combinations in which
 * that literal string of text is called upon as well as other related information.
 *
 */
function getStringDefinitions(localeBasePath, moduleName) {
  const localeFilePath = `${localeBasePath}/${moduleName}-messages.json`;
  let coreStringsFilePath = `${localeBasePath}/default_frontend-messages.json`;
  let fileContents;
  let definitions = {};

  try {
    fileContents = JSON.parse(fs.readFileSync(localeFilePath));
    // If we aren't processing default_frontend, ensure we include definitions
    // there that are in the CommonCoreStrings namespace.
    if (moduleName !== 'default_frontend') {
      const coreContents = JSON.parse(fs.readFileSync(coreStringsFilePath));
      fileContents = { ...fileContents, ...coreContents };
    }
  } catch (e) {
    // Not all modules have messages files - return null and we'll bail.
    if (!fileContents) {
      return null;
    }
  }

  Object.keys(fileContents).forEach(nsKeyPair => {
    const nsAndKey = nsKeyPair.split('.');
    const namespace = nsAndKey[0];
    const key = nsAndKey[1];
    const string = fileContents[nsKeyPair];

    if (definitions[string]) {
      definitions[string].definitions.push({
        namespace,
        key,
      });
    } else {
      definitions[string] = {
        definitions: [{ namespace, key }],
        uses: [],
      };
    }
  });

  return definitions;
}

// Instantiates the CSV data and writes to a file.
function writeProfileToCSV(profile, moduleName, localePath) {
  // Be sure the output path is going to the profiles folder.
  let baseOutputPath = `${path.resolve(localePath)}`;
  if (!baseOutputPath.includes(PROFILES_FOLDER)) {
    baseOutputPath += `/${PROFILES_FOLDER}`;
  }

  // Ensure we have a {localePath}/profile directory available.
  mkdirp.sync(baseOutputPath);

  const outputFile = `${baseOutputPath}/${moduleName}.csv`;
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
      let definitions = data.definitions;
      let uses = data.uses;
      let dataRows = [];
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
        let newUse = {
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
    []
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
function getStringFromNamespaceKey(profile, namespace, key) {
  // Check against every translation string in the profile as a key.
  for (let str of Object.keys(profile)) {
    let matchedNamespace = profile[str].definitions.find(def => def.namespace === namespace);
    let matchedKey = profile[str].definitions.find(def => def.key === key);

    // If we have matched the translation string to our NS and Key then we win!
    if (matchedNamespace && matchedKey) {
      return str;
    }
  }
}

// Returns if the file is the type of *.vue file we're interested in.
function urlIsVue(parsedUrl, module) {
  return (
    module.resource &&
    parsedUrl.pathname.endsWith('.vue') &&
    parsedUrl.query &&
    parsedUrl.query.includes('lang=js') &&
    !parsedUrl.pathname.includes('node_modules')
  );
}

// Returns if the file is the type of *.js file we're interested in.
function urlIsJS(module) {
  return (
    module.resource &&
    module.resource.indexOf('.js') === module.resource.length - 3 &&
    !module.resource.includes('node_modules')
  );
}

// Given a node's array of arguments, extract and return the key... or null no dice.
function keyFromArguments(args, namespace) {
  let key = null;
  if (args && Array.isArray(args)) {
    if (args.length > 0) {
      if (args[0].type === 'Literal') {
        key = args[0].value;
      }
    }
  }
  if (key === null) {
    logKeyError(namespace, key);
  }
  return key;
}

// Given a /path/to/file/ we can have two kinds:
// /path/NameSpace/index.vue or /path/to/NameSpace.vue
// If the last bit is `index.vue` we use the parent dir, otherwise
// we use the filename.
function namespaceFromPath(path) {
  const parts = path.split('/');
  const lastIndex = parts.length - 1;
  const lastPart = parts[lastIndex];

  if (lastPart === 'index.vue') {
    return parts[lastIndex - 1]; // Parent dir name
  } else {
    return lastPart.replace('.vue', ''); // Vue filename sans .vue
  }
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

function profileVueScript(profile, ast, pathname) {
  let namespace;
  let key;
  let common = false;
  try {
    traverse(ast, {
      pre: function(node) {
        // If the node is a Property and has a key.name of `name` then it's
        // going to give us the namespace of our current module.
        if (node.type === 'Property' && !namespace) {
          if (node.key.name === 'name') {
            namespace = node.value.value;
          }
        }
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
                  COMMON_NAMESPACES[node.callee.property.name]
                );
                common = true;
              }

              let currentNamespace = common
                ? COMMON_NAMESPACES[node.callee.property.name]
                : namespace;

              if (key && currentNamespace) {
                let $tring = getStringFromNamespaceKey(profile, currentNamespace, key);

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

function profileVueTemplate(profile, ast, pathname) {
  let namespace;
  let key;
  let common = false;
  try {
    traverse(ast, {
      pre: function(node) {
        // If the node is a Property and has a key.name of `name` then it's
        // going to give us the namespace of our current module.
        if (!namespace) {
          namespace = namespaceFromPath(pathname);
        }
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

            let currentNamespace = common ? COMMON_NAMESPACES[node.callee.name] : namespace;

            if (key && currentNamespace) {
              let $tring = getStringFromNamespaceKey(profile, currentNamespace, key);

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

function profileJSFile(profile, ast, pathname) {
  let common = false;
  let varDeclarations = {};
  let $trUses = {};

  // Process the AST
  try {
    traverse(ast, {
      pre: function(node) {
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
                let varName = node.callee.object.name;
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
    let namespace = varDeclarations[variable];

    let uses = $trUses[variable];
    if (uses) {
      uses.forEach(key => {
        let $tring = getStringFromNamespaceKey(profile, namespace, key);
        if (namespace && key && $tring) {
          profile[$tring].uses.push({
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
module.exports = ProfileStrings;
module.exports.writeProfileToCSV = writeProfileToCSV;
