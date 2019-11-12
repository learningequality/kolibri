const url = require('url');
const espree = require('espree');
const escodegen = require('escodegen');
const mkdirp = require('mkdirp');
const sortBy = require('lodash/sortBy');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const logging = require('./logging');
const coreAliases = require('./apiSpecExportTools').coreAliases;

// Find alias for i18n utils, do this so that we don't have to hard code it here
const i18nAlias = Object.keys(coreAliases()).find(key => key.includes('i18n'));

// String appended prior to the identifier for context.
const CONTEXT_LINE = '\n-- CONTEXT --\n';

function isCamelCase(str) {
  return /^[a-z][a-zA-Z0-9]*$/.test(str);
}

function isPascalCase(str) {
  return /^[A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/.test(str);
}

function generateMessagesObject(messagesObject) {
  // define here and then let it be assigned during eval
  var messages; // eslint-disable-line no-unused-vars
  // AST node that can be used to generate the messages object once parsed from the module
  var messagesAST = {
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      operator: '=',
      left: {
        type: 'Identifier',
        name: 'messages',
      },
      right: messagesObject,
    },
  };
  return eval(escodegen.generate(messagesAST));
}

function ExtractStrings(messageDir, messagesName) {
  this.messageDir = messageDir;
  this.messagesName = messagesName;
}

ExtractStrings.prototype.apply = function(compiler) {
  var self = this;
  // Only do this in non-production mode, as otherwise the module detection code
  // does not work for .vue files.
  if (process.env.NODE_ENV !== 'production') {
    compiler.hooks.emit.tapAsync('extractStrings', function(compilation, callback) {
      var messageExport = {};
      var nameSpaces = [];
      function registerFoundMessages(messageNameSpace, messages, module) {
        if (messageNameSpace) {
          // Warn about duplicate nameSpaces *within* a bundle (no way to warn across).
          if (nameSpaces.indexOf(messageNameSpace) !== -1) {
            logging.error(
              'Duplicate namespace ' + messageNameSpace + ' found in ' + module.resource
            );
          } else if (Object.keys(messages).length) {
            // Check that the namespace is PascalCase.
            if (!isPascalCase(messageNameSpace)) {
              logging.error(
                `Name id "${messageNameSpace}" should be in PascalCase. Found in ${module.resource}`
              );
            }
            nameSpaces.push(messageNameSpace);
            Object.keys(messages).forEach(function(key) {
              // Every message needs to be namespaced - don't pollute our top level!
              // Create a new message id from the name space and the message id joined with '.'
              var msgId = messageNameSpace + '.' + key;
              // Save it onto our export object for the whole bundle.
              messageExport[msgId] = messages[key];
            });
          }
          // Someone defined a $trs object, but didn't namespace it
          // warn them about it here so they can fix their foolishness.
        } else if (Object.keys(messages).length) {
          logging.error(
            'Translatable messages have been defined in ' +
              module.resource +
              ' but no messageNameSpace was specified.'
          );
        }
      }
      compilation.chunks.forEach(function(chunk) {
        var messageNameSpace;
        var messages;
        var ast;
        var parsedUrl;
        // Explore each module within the chunk (built inputs):
        for (const module of chunk.modulesIterable) {
          messageNameSpace = undefined;
          messages = {};
          parsedUrl = module.resource && url.parse(module.resource);
          if (
            module.resource &&
            parsedUrl.pathname.endsWith('.vue') &&
            parsedUrl.query &&
            parsedUrl.query.includes('lang=js') &&
            !parsedUrl.pathname.includes('node_modules')
          ) {
            // Inspect each source file in the chunk if it is a vue file.
            // Parse the AST for the Vue file.
            ast = espree.parse(module._source.source(), {
              sourceType: 'module',
              ecmaVersion: 2018,
            });
            // Maintain references to possible component definitions in case
            // it is not exported as the default export
            var componentCache = {};
            ast.body.forEach(function(node) {
              // Look through each top level node until we find the module.exports or export default
              // Can either be a direct export of the component object,
              // or variable name that defines it.
              if (
                node.type === 'VariableDeclaration' &&
                node.declarations[0].init.type === 'ObjectExpression'
              ) {
                componentCache[node.declarations[0].id.name] = node.declarations[0].init.properties;
              }
              // Is it an expression?
              if (
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
                // Is it an export default declaration?
                (node.type === 'ExportDefaultDeclaration' &&
                  // Is it an object expression?
                  (node.declaration.type === 'ObjectExpression' ||
                    // Is it an identifier?
                    node.declaration.type === 'Identifier'))
              ) {
                let properties;
                if (node.type === 'ExportDefaultDeclaration') {
                  if (node.declaration.type === 'ObjectExpression') {
                    properties = node.declaration.properties;
                  } else if (node.declaration.type === 'Identifier') {
                    properties = componentCache[node.declaration.name];
                  }
                } else if (node.type === 'ExpressionStatement') {
                  properties = node.expression.right.properties;
                }
                if (properties) {
                  // Look through each of the properties in the object that is being exported.
                  properties.forEach(function(property) {
                    // If the property is called $trs we have hit paydirt!
                    // Some messages for us to grab!
                    if (property.key.name === '$trs') {
                      // Grab every message in our $trs property and
                      // save it into our messages object.
                      property.value.properties.forEach(function(messageNode) {
                        // Check that the trs id is camelCase.
                        if (!isCamelCase(messageNode.key.name)) {
                          logging.error(
                            `$trs id "${messageNode.key.name}" should be in camelCase. Found in ${module.resource}`
                          );
                        }
                        // First, check if the value is an object
                        // and extract the string and context.
                        if (messageNode.value.type === 'ObjectExpression') {
                          const stringNode = messageNode.value.properties.filter(
                            prop => prop.key.name === 'message'
                          )[0];
                          const contextNode = messageNode.value.properties.filter(
                            prop => prop.key.name === 'context'
                          )[0];

                          const message =
                            stringNode && stringNode.value ? stringNode.value.value : null;
                          const context =
                            contextNode && contextNode.value ? contextNode.value.value : '';

                          // Ensure that there is a value for the string key passed.
                          if (!message) {
                            logging.error(
                              `The value for $trs ${messageNode.key.name} is not valid. Make sure it is a
                              string or an object including a key 'message'. Found in ${module.resource}`
                            );
                          }
                          messages[messageNode.key.name] = { message, context };
                        } else {
                          // If the value is not an object,
                          // ensure a value is passed in the first place.
                          if (!messageNode.value.value) {
                            logging.error(
                              `The value for $trs ${messageNode.key.name} is not valid. Make sure it is a
                              string or an object including a key 'message'. Found in ${module.resource}`
                            );
                          } else {
                            messages[messageNode.key.name] = messageNode.value.value;
                          }
                        }
                      });
                      // We also want to take a note of the name space
                      // these messages have been put in too!
                    } else if (property.key.name === 'name') {
                      messageNameSpace = property.value.value;
                    }
                  });
                }
                registerFoundMessages(messageNameSpace, messages, module);
              }
            });
          } else if (
            module.resource &&
            module.resource.indexOf('.js') === module.resource.length - 3 &&
            !module.resource.includes('node_modules')
          ) {
            // Inspect each source file in the chunk if it is a js file too.
            ast = espree.parse(module._source.source(), {
              sourceType: 'module',
            });
            var createTranslateFn;
            // First find the reference being used for the create translator function
            ast.body.forEach(node => {
              // Check if an import
              if (
                node.type === espree.Syntax.ImportDeclaration &&
                // Check if importing from the i18n alias
                node.source.value === i18nAlias
              ) {
                node.specifiers.forEach(spec => {
                  // Check if this import spec is for the createTranslator function
                  if (spec.imported.name === 'createTranslator') {
                    // If so store the locally imported variable name it was assigned to
                    createTranslateFn = spec.local.name;
                  }
                });
              }
            });
            /* eslint-disable no-inner-declarations */
            function traverseTree(node, scopeChain) {
              function getVarScope(name) {
                return scopeChain.find(scope => typeof scope[name] !== 'undefined');
              }
              var varScope;
              if (node) {
                if (
                  node.type === espree.Syntax.FunctionDeclaration ||
                  node.type === espree.Syntax.FunctionExpression ||
                  node.type === espree.Syntax.Program
                ) {
                  // These node types create a new scope
                  scopeChain.unshift({});
                }
                var localScope = scopeChain[0];
                // New declarations only affect the local scope
                if (node.type === espree.Syntax.VariableDeclaration) {
                  node.declarations.forEach(dec => {
                    localScope[dec.id.name] = dec.init;
                  });
                }
                // Check if is an expression
                if (
                  node.type === espree.Syntax.ExpressionStatement &&
                  // That assigns a value
                  node.expression.type === espree.Syntax.AssignmentExpression &&
                  // To a variable
                  node.expression.left.type === espree.Syntax.Identifier &&
                  // But only handle equality, because other kinds are difficult to track
                  node.expression.operator === '='
                ) {
                  // Find the relevant scope where the variable being assigned to is defined
                  // If no scope matches, either it is an undeclared variable, or is an ES6
                  // style default function parameter, either way, assign to localScope for
                  // safety.
                  varScope = getVarScope(node.expression.left.name) || localScope;
                  varScope[node.expression.left.name] = node.expression.right;
                }
                if (
                  node.type === espree.Syntax.CallExpression &&
                  node.callee.name === createTranslateFn
                ) {
                  var messageNameSpace, messages;
                  var firstArg = node.arguments[0];
                  if (firstArg.type === espree.Syntax.Literal) {
                    // First argument is a string, get its value directly
                    messageNameSpace = firstArg.value;
                  } else if (firstArg.type === espree.Syntax.Identifier) {
                    // First argument is a variable, lookup in the appropriate scope
                    varScope = getVarScope(firstArg.name);
                    if (varScope) {
                      messageNameSpace = varScope[firstArg.name].value;
                    } else {
                      logging.warn(
                        `Translator object called with undefined name space argument in ${module.resource}`
                      );
                    }
                  }
                  var secondArg = node.arguments[1];
                  if (secondArg.type === espree.Syntax.ObjectExpression) {
                    // Second argument is an object, parse this chunk of
                    // the AST to get an object back
                    messages = generateMessagesObject(secondArg);
                  } else if (secondArg.type === espree.Syntax.Identifier) {
                    // Second argument is a variable, lookup in the appropriate scope
                    varScope = getVarScope(secondArg.name);
                    if (varScope) {
                      messages = generateMessagesObject(varScope[secondArg.name]);
                    } else {
                      logging.warn(
                        `Translator object called with undefined messages argument in ${module.resource}`
                      );
                    }
                  }
                  registerFoundMessages(messageNameSpace, messages, module);
                }
                for (var key in node) {
                  if (node.hasOwnProperty(key)) {
                    var child = node[key];
                    if (typeof child === 'object' && child !== null) {
                      if (Array.isArray(child)) {
                        child.forEach(function(node) {
                          traverseTree(node, scopeChain);
                        });
                      } else {
                        traverseTree(child, scopeChain);
                      }
                    }
                  }
                }
                if (
                  node.type === espree.Syntax.FunctionDeclaration ||
                  node.type === espree.Syntax.FunctionExpression ||
                  node.type === espree.Syntax.Program
                ) {
                  // Leaving this scope now!
                  scopeChain.shift();
                }
              }
            }
            if (createTranslateFn) {
              traverseTree(ast, []);
            }
          }
        }
      });
      /* eslint-enable no-inner-declarations */
      if (Object.keys(messageExport).length) {
        // If we've got any messages to write out, write them out. Otherwise, don't bother.
        self.writeOutput(messageExport);
        compilation.bundleHasMessages = true;
      } else {
        compilation.bundleHasMessages = false;
      }
      callback();
    });
  }
};

ExtractStrings.prototype.writeOutput = function(messageExport) {
  // Make sure the directory we are using exists.
  mkdirp.sync(this.messageDir);
  // Write out the data to CSV.
  toCSV(`${this.messageDir}/${this.messagesName}-messages.csv`, messageExport);
  // Write out the data to JSON.
  /*
  fs.writeFileSync(
    path.join(this.messageDir, this.messagesName + '-messages.json'),
    // pretty print and sort keys
    JSON.stringify(messageExport, Object.keys(messageExport).sort(), 2)
  );
  */
};

function toCSV(path, messages) {
  const csvWriter = createCsvWriter({
    path,
    header: [
      { id: 'identifier', title: 'Identifier' },
      { id: 'sourceString', title: 'Source String' },
      { id: 'context', title: 'Context' },
      { id: 'translation', title: 'Translation' },
    ],
  });

  const csvData = Object.keys(messages).map(identifier => {
    let sourceString,
      context = '';

    if (typeof messages[identifier] === 'object') {
      sourceString = messages[identifier]['message'];
      context = messages[identifier]['context'];
    } else {
      sourceString = messages[identifier];
    }

    context = CONTEXT_LINE + context;

    return {
      identifier,
      sourceString,
      context,
      translation: '',
    };
  });
  const fileName = path.split('/')[path.split('/').length - 1];
  csvWriter
    .writeRecords(sortBy(csvData, 'identifier'))
    .then(() => logging.log(`Generated CSV messages file: ${fileName}`));
}

module.exports = ExtractStrings;
module.exports.CONTEXT_LINE = CONTEXT_LINE;
