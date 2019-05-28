var fs = require('fs');
var path = require('path');
var url = require('url');
var espree = require('espree');
var traverse = require('ast-traverse');
var createCsvWriter = require('csv-writer').createObjectCsvWriter;
var escodegen = require('escodegen');
var mkdirp = require('mkdirp');
var reduce = require('lodash/reduce');
var isEqual = require('lodash/isEqual');
var logging = require('./logging');
var coreAliases = require('./apiSpecExportTools').coreAliases;
var vueCompiler = require('vue-template-compiler');
var util = require('util')

// NOTES:
/**
 * Compilation happens on every file/module.
 * Meaning - this file is loaded each time, freshly.
 * Meaning - this should work on a per-module basis.
 * Meaning:
 *
 * TODO:
 *
 * - Write export to CSV code.
 * - Refactor the getStringDefinitions() accordingly.
 * - Organize Vue VS JS file parsing code.
 * - Write the JS file parsing code.
 * - Try to include the filepath on the uses objects.
 * - ???
 * - Profit.
 *
 *
 *
 * cannot manipulate the profile$trs local scope and keep data. sad fucking day.
 */

function profile$trs(localePath, moduleName) {
  this.localePath = localePath;
  this.moduleName = moduleName;
  this.hasErrors = false;
}

/**
 * TODO NEXT RIGHT NOW
 * - Rework all functions so that they're not a part of the prototype
 * - They all take strProfile params which will act on it.
 */

/* Webpack Entry */
profile$trs.prototype.apply = function(compiler) {
  const self = this;

  // Only works in non-production mode.
  if (process.env.NODE_ENV !== 'production') {
    compiler.hooks.emit.tapAsync('Profile$Trs', function(compilation, callback) {
      let strProfile = getStringDefinitions(self.localePath, self.moduleName);
      let undefinedCombinations = {};
      let numUses = 0; // TODO: REMOVE
      let createTranslators = [];
      let $trCalls = [];

      // Not all modules have messages files - bail if we don't get one.
      if (!strProfile) {
        callback();
        return;
      }

      fs.writeFileSync(`/home/jacob/.kolibri/logs/define-${self.moduleName}.json`, JSON.stringify(strProfile));
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

            // Go through the tree....
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
                          let $tring = getStringFromNamespaceKey(strProfile, namespace, key, common);

                          if ($tring) {
                            strProfile[$tring].uses.push({
                              namespace,
                              key,
                              common,
                              parsedUrl: parsedUrl.pathname,
                            });
                            numUses++; // TODO: REMOVE
                          } else {
                            logging.log(`Could not get a $tring for ${namespace}.${key} in ${self.moduleName} because ${key} is not an available key. This indicates that $tr() was called and passed a variable.`)
                          }
                        }
                      }
                    }
                  }
                },
              });

              // AST does not parse the <template> - so compile the template and find what we need.
              const vueFile = fs.readFileSync(parsedUrl.pathname);
              const template = vueCompiler.compile(vueFile.toString());

              template.ast.children.forEach((node) => {
                extractVueTemplateUses(strProfile, node, namespace, parsedUrl.pathname);
              })

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
                // Profile all variable declarations using the
                // name of the variable as the key and the Namespace
                // as the value in the dictionary.
                pre: function(node, parent) {
                  if (node.type === 'VariableDeclarator') {
                    if (node.init && node.init.type === 'CallExpression') {
                      if (node.init.callee && node.init.callee.type === 'Identifier') {
                        if (node.init.callee.name === 'createTranslator') {
                          varDeclarations[node.id.name] = node.init.arguments[0].value;
                        }
                      }
                    }
                  }
                  if (node.type === 'CallExpression') {
                    if (node.callee && node.callee.type === 'MemberExpression') {
                      if (node.callee.property && node.callee.property.name === '$tr') {
                        if (node.arguments && node.arguments.length > 0) {
                          let varName = node.callee.object.name;
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
                    numUses++; // TODO: REMOVE
                  }
                });
              }
            });
          }
        }
      });
      logging.log(`${numUses} Uses`);
      writeProfileToCSV(strProfile, self.moduleName);
      callback();
    });
  }
};

/* Utility Functions */

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

function extractVueTemplateUses(profile, node, namespace, parsedUrl) {
  let $tregex = /\$tr\(/;
  let $treplace = /(\S|\s)*\$tr\([\\"']+|[\\"']+\).*$/;
  let reCommon = /common\$tr/;

  let key;
  let common = false;

  if(node.type === 1) { // Element
    if(node.attrsMap) {
      Object.keys(node.attrsMap).forEach(attr => {
        let val = node.attrsMap[attr];
        if($tregex.test(val)) {
          console.log(`Testing Positive for ${val}`)
          common = reCommon.test(val);
          key = val.replace($treplace, '');
        }
      })
    }
  }
  if(node.type === 2 || node.type === 3) { // Expression or Text Nodes
    common = reCommon.test(node.text);
    key = node.text.replace($treplace, '');
  }
  if(key) {
    let $tring = getStringFromNamespaceKey(profile, namespace, key, common);
    if($tring) {
      profile[$tring].uses.push({
        namespace,
        key,
        common,
        parsedUrl: parsedUrl.pathname
      })
    }
  }
  // Recurse on this MFer
  if(node.children && node.children.length > 0) {
    node.children.forEach(child => {
      extractVueTemplateUses(profile, child, namespace, parsedUrl);
    })
  }
}

function writeProfileToCSV(profile, moduleName) {
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
  csvWriter.writeRecords(csvData).then(() => console.log(`Profile CSV written to ${outputFile}`));
}

function profileToCSV(profile) {
  fs.writeFileSync(`/home/jacob/.kolibri/logs/bk/file-${Math.floor(Math.random()*10000) + 1}.json`, JSON.stringify(profile))
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
        }

        if(!dataRows.some(data => isEqual(data, newUse))) {
          dataRows.push(newUse);
        }
      });
      csv = [...csv, ...dataRows];
      return csv;
    },
    []
  );
}

function filterByModule(definitions, module) {
  return reduce(
    definitions,
    (result, val, key) => {
      if (val.module === module) {
        result[key] = val;
      }
      return result;
    },
    {}
  );
}

function getStringFromNamespaceKey(profile, namespace, key, common = false) {
  let $tr = null;

  for(let str of Object.keys(profile)) {
    if($tr) {
      break;
    }

    let matchedNamespace;
    let matchedKey;

    if(common) {
      matchedNamespace = profile[str].definitions.find(def => def.namespace.includes("Common"));
    } else {
      matchedNamespace = profile[str].definitions.find(def => def.namespace === namespace);
    }

    if(matchedNamespace) {
      matchedKey = profile[str].definitions.find(def => def.key === key);
    }
    if (matchedNamespace && matchedKey) {
      $tr = str;
    }
  }

  return $tr;
}

function nodeIsExpression(node) {
  return (
    (node.type === 'ExpressionStatement' &&
      // Is it an assignment expression?
      node.expression.type === 'AssignmentExpression' &&
      // Is the first part of the assignment 'module'?
      ((node.expression.left || {}).object || {}).name == 'module' &&
      // Is it assining to the 'exports' property of 'module'?
      ((node.expression.left || {}).property || {}).name == 'exports' &&
      // Does the right hand side of the assignment expression have any properties?
      // (We don't want to both parsing it if it is an empty object)
      node.expression.right.properties) ||
    // Is it an export default declaration?f
    (node.type === 'ExportDefaultDeclaration' &&
      // Is it an object expression?
      (node.declaration.type === 'ObjectExpression' ||
        // Is it an identifier?
        node.declaration.type === 'Identifier'))
  );
}

function propertiesFromNode(node, componentCache = {}) {
  if (node.type === 'ExportDefaultDeclaration') {
    if (node.declaration.type === 'ObjectExpression') {
      return node.declaration.properties;
    } else if (node.declaration.type === 'Identifier') {
      return componentCache[node.declaration.name];
    }
  } else if (node.type === 'ExpressionStatement') {
    return node.expression.right.properties;
  }
}

function urlIsVue(parsedUrl, module) {
  return (
    module.resource &&
    parsedUrl.pathname.endsWith('.vue') &&
    parsedUrl.query &&
    parsedUrl.query.includes('lang=js') &&
    !parsedUrl.pathname.includes('node_modules')
  );
}

function urlIsJS(module) {
  return (
    module.resource &&
    module.resource.indexOf('.js') === module.resource.length - 3 &&
    !module.resource.includes('node_modules')
  );
}

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
