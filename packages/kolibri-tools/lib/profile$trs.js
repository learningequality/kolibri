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
var util = require('util');


function profile$trs(localePath, moduleName) {
  this.localePath = localePath;
  this.moduleName = moduleName;
  this.hasErrors = false;
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

      fs.writeFileSync(
        `/home/jacob/.kolibri/logs/define-${self.moduleName}.json`,
        JSON.stringify(strProfile)
      );
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
                              `Could not get a $tring for ${namespace}.${key} in ${
                                self.moduleName
                              } because ${key} is not an available key. This indicates that $tr() was called and passed a variable.`
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

                template.ast.children.forEach(node => {
                  uses = extractVueTemplateUses(strProfile, node, namespace, parsedUrl);
                });
                if(uses) {
                  Object.keys(uses).forEach(str => {
                    if (strProfile[str]) {
                      strProfile[str].uses = [...strProfile[str].uses, ...uses[str].uses];
                    } else {
                      strProfile[str].uses = uses[str].uses;
                    }
                  });
                }
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
  if(!namespace) {
    return;
  }
  let $tregex = /\$tr\(/;
  let $treplace = /(\S|\s)*\$tr\([\\"']+|[\\"']+\)(\S|\s)*/g;
  let reCommon = /common\$tr/;

  let key;
  let common = false;

  let nodeUses = {};

  if (node.type === 1) {
    // Element
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
  if (node.type === 2 || node.type === 3) {
    // Expression or Text Nodes
    if($tregex.test(node.text)) {
      common = reCommon.test(node.text);
      key = node.text.replace($treplace, '');
    }
  }
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
          nodeUses[childStr].uses = [...nodeUses[childStr].uses, ...childUses[childStr].uses]; // Combine incoming uses
        } else {
          nodeUses[childStr] = {
            uses: childUses[childStr].uses
          }
        }
      });
    });
  }

  return nodeUses;
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
  csvWriter.writeRecords(csvData).then(() => logging.log(`Profile CSV written to ${outputFile}`));
}

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
        if(!dataRows.some(use => isEqual(use, newUse))) {
          dataRows.push(newUse);
        }
      });
      csv = [...csv, ...dataRows];
      return csv;
    },
    []
  );
}

function getStringFromNamespaceKey(profile, namespace, key, common = false) {
  let $tr = null;

  for (let str of Object.keys(profile)) {
    if ($tr) {
      break;
    }

    let matchedNamespace;
    let matchedKey;

    if (common) {
      matchedNamespace = profile[str].definitions.find(def => def.namespace.includes('Common'));
    } else {
      matchedNamespace = profile[str].definitions.find(def => def.namespace === namespace);
    }

    if (matchedNamespace) {
      matchedKey = profile[str].definitions.find(def => def.key === key);
    }
    if (matchedNamespace && matchedKey) {
      $tr = str;
    }
  }

  return $tr;
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
