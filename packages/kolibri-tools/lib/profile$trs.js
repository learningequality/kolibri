var fs = require('fs');
var url = require('url');
var espree = require('espree');
var traverse = require('ast-traverse');
var createCsvWriter = require('csv-writer').createObjectCsvWriter;
var reduce = require('lodash/reduce');
var isEqual = require('lodash/isEqual');
var vueCompiler = require('vue-template-compiler');
var logging = require('./logging');

function profile$trs(localePath, moduleName) {
  this.localePath = localePath;
  this.moduleName = moduleName;
}

/* Webpack Entry */
profile$trs.prototype.apply = function(compiler) {
  const self = this;

  // Only works in non-production mode.
  if (process.env.NODE_ENV !== 'production') {
    compiler.hooks.emit.tapAsync('Profile$Trs', function(compilation, callback) {
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

          // The properties for each "Use"
          let namespace;
          let key;
          let common = false;

          // Processing Vue files only here.
          if (urlIsVue(parsedUrl, module)) {
            // Create the AST
            ast = espree.parse(module._source.source(), {
              sourceType: 'module',
              ecmaVersion: 2018,
            });

            // Go through the tree - parsing JS in <script> tags.
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
                        // node.arguments comes as an array - the first one in $tr and common$tr
                        // is always the key.
                        if (node.callee.property.name === '$tr') {
                          key = keyFromArguments(node.arguments);
                          common = false;
                        }
                        if (node.callee.property.name === 'common$tr') {
                          key = keyFromArguments(node.arguments);
                          common = true;
                        }
                        if (key !== undefined && namespace) {
                          let $tring = getStringFromNamespaceKey(
                            strProfile,
                            namespace,
                            key,
                            common
                          );

                          if ($tring) {
                            strProfile[$tring].uses.push({
                              namespace,
                              key,
                              common,
                              parsedUrl: parsedUrl.pathname,
                            });
                          } else {
                            logging.log(
                              `No string found for ${namespace}.${key}. Either the combination is not
                              defined or the key we found was passed as a variable and not a key string`
                            );
                          }
                        }
                      }
                    }
                  }
                },
              });

              // AST does not parse the <template> - so compile the template and find what we need.
              if (parsedUrl.pathname) {
                const vueFile = fs.readFileSync(parsedUrl.pathname);
                const template = vueCompiler.compile(vueFile.toString());
                let uses;

                // Pass each highest-level node to our extractVueTemplateUses.
                // Vue templates kinda demand that you have one high-level node to rule
                // them all so we're passing one node.
                template.ast.children.forEach(node => {
                  uses = extractVueTemplateUses(strProfile, node, namespace, parsedUrl);
                  if (uses) {
                    Object.keys(uses).forEach(str => {
                      if (strProfile[str]) {
                        strProfile[str].uses = [...strProfile[str].uses, ...uses[str].uses];
                      } else {
                        strProfile[str].uses = uses[str].uses;
                      }
                    });
                  }
                });
              }
            } catch (e) {
              logging.error(e);
            }
          }

          // Processing *.js files now
          if (urlIsJS(module)) {
            ast = espree.parse(module._source.source(), {
              sourceType: 'module',
            });

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
                  let $tring = getStringFromNamespaceKey(strProfile, namespace, key);
                  if (namespace && key && $tring) {
                    strProfile[$tring].uses.push({
                      namespace,
                      key,
                      common,
                      parsedUrl: parsedUrl.pathname,
                    });
                  }
                });
              }
            });
          }
        }
      });
      writeProfileToCSV(strProfile, self.moduleName);
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
  let fileContents;
  let definitions = {};

  try {
    fileContents = JSON.parse(fs.readFileSync(localeFilePath));
  } catch (e) {
    // Not all modules have messages files - return null and we'll bail.
    return null;
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

/*
* Function which will recursively traverse the the given node, finding all
* $tr() and common$tr() calls, extracting their keys and finding which string
* the Namespace+Key refers to. Each use is stored and passed to this function
* again, ultimately resolving to combine all uses throughout the node tree.
*/
function extractVueTemplateUses(profile, node, namespace, parsedUrl) {
  if (!namespace) {
    return;
  }
  // Checks for any instance of `$tr(` in a string.
  let $tregex = /\$tr\(/;
  // Globally matches everything left and right of a string of text that is wrapped
  // in `... $tr('` and `')...` - when used in replace() it will return the param we need.
  let $treplace = /(\S|\s)*\$tr\([\\"']+|[\\"']+\)(\S|\s)*/g;
  // Matches `common$tr` specifically.
  let reCommon = /common\$tr/;

  let key;
  let common = false;

  let nodeUses = {};

  // Node type 1 is a DOM element with attrs mapped, which we will
  // check for uses.
  if (node.type === 1) {
    if (node.attrsMap) {
      Object.keys(node.attrsMap).forEach(attr => {
        let val = node.attrsMap[attr];
        if ($tregex.test(val)) {
          common = reCommon.test(val);
          key = val.replace($treplace, '');
        }
      });
    }
  }

  // Node types 2 and 3 are Expression or Text nodes respectively.
  // Both, conveniently, store relevant data in a `text` property.
  if (node.type === 2 || node.type === 3) {
    if ($tregex.test(node.text)) {
      common = reCommon.test(node.text);
      key = node.text.replace($treplace, '');
    }
  }

  // With the key - we can try to find a string defined for this combination
  // of Namespace & Key in this current module's profile.
  if (key) {
    let $tring = getStringFromNamespaceKey(profile, namespace, key, common);
    if ($tring) {
      if (!nodeUses[$tring]) {
        // Instantiate the array on the key if it hasn't been done.
        nodeUses[$tring] = {
          uses: [],
        };
      }
      nodeUses[$tring].uses.push({
        namespace,
        key,
        common,
        parsedUrl: parsedUrl.pathname,
      });
    }
  }
  // Recurse!
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      let childUses = extractVueTemplateUses(profile, child, namespace, parsedUrl);
      // Combine this scope's nodeUses with that returned from the recursed fn call.
      Object.keys(childUses).forEach(childStr => {
        if (nodeUses[childStr]) {
          // Combine incoming uses
          nodeUses[childStr].uses = [...nodeUses[childStr].uses, ...childUses[childStr].uses];
        } else {
          nodeUses[childStr] = {
            uses: childUses[childStr].uses,
          };
        }
      });
    });
  }

  return nodeUses;
}

// Instantiates the CSV data and writes to a file.
function writeProfileToCSV(profile, moduleName) {
  // TODO: Don't use my local fs...
  const outputFile = `/home/jacob/.kolibri/logs/${moduleName}.csv`;
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
function getStringFromNamespaceKey(profile, namespace, key, common = false) {
  let $tr = null;

  // Check against every translation string in the profile as a key.
  for (let str of Object.keys(profile)) {
    // Bail if we find a $tring that matched.
    if ($tr) {
      break;
    }

    let matchedNamespace;
    let matchedKey;

    if (common) {
      // Assumes that all Common*Strings namespaces will include the word Common in them... may need
      // to address this in a better fashion.
      matchedNamespace = profile[str].definitions.find(def => def.namespace.includes('Common'));
    } else {
      matchedNamespace = profile[str].definitions.find(def => def.namespace === namespace);
    }

    if (matchedNamespace) {
      matchedKey = profile[str].definitions.find(def => def.key === key);
    }

    // If we have matched the translation string to our NS and Key then we win!
    if (matchedNamespace && matchedKey) {
      $tr = str;
    }
  }

  return $tr;
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
function keyFromArguments(args) {
  let key = null;
  if (args && Array.isArray(args)) {
    if (args.length > 0) {
      if (args[0].type === 'Literal') {
        key = args[0].value;
      }
    }
  }
  return key;
}

module.exports = profile$trs;
