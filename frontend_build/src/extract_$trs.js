var esprima = require('esprima');
var escodegen = require('escodegen');
var logging = require('./logging');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var coreAliases = require('./apiSpecExportTools').coreAliases;

// Find alias for i18n utils, do this so that we don't have to hard code it here
var i18nAlias = Object.keys(coreAliases()).find(key => key.includes('i18n'));

function isCamelCase(str) {
  return /^[a-z][a-zA-Z0-9]*$/.test(str);
}

function generateMessagesObject(messagesObject) {
  // define here and then let it be assigned during eval
  var messages;
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

function extract$trs(messageDir, messagesName) {
  this.messageDir = messageDir;
  this.messagesName = messagesName;
}

extract$trs.prototype.apply = function(compiler) {
  var self = this;

  compiler.plugin('emit', function(compilation, callback) {
    var messageExport = {};
    var nameSpaces = [];
    function registerFoundMessages(messageNameSpace, messages, module) {
      if (messageNameSpace) {
        // Warn about duplicate nameSpaces *within* a bundle (no way to warn across).
        if (nameSpaces.indexOf(messageNameSpace) !== -1) {
          logging.error('Duplicate namespace ' + messageNameSpace + ' found in ' + module.resource);
        } else if (Object.keys(messages).length) {
          // Check that the namespace is camelCase.
          if (!isCamelCase(messageNameSpace)) {
            logging.error(
              `Name id "${messageNameSpace}" should be in camelCase. Found in ${module.resource}`
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
        // Someone defined a $trs object, but didn't namespace it - warn them about it here so they can fix their foolishness.
      } else if (Object.keys(messages).length) {
        logging.error(
          'Translatable messages have been defined in ' +
            module.resource +
            ' but no messageNameSpace was specified.'
        );
      }
    }
    compilation.chunks.forEach(function(chunk) {
      // Explore each module within the chunk (built inputs):
      chunk.forEachModule(function(module) {
        if (module.resource && module.resource.indexOf('.vue') === module.resource.length - 4) {
          // Inspect each source file in the chunk if it is a vue file.
          var messageNameSpace;
          var messages = {};
          // Parse the AST for the Vue file.
          var ast = esprima.parse(module._source.source(), {
            sourceType: 'module',
          });
          ast.body.forEach(function(node) {
            // Look through each top level node until we find the module.exports or export default
            // N.B. this relies on our convention of directly exporting the Vue component
            // with the module.exports or export default, rather than defining it and then setting it to export.

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
                node.declaration.type === 'ObjectExpression')
            ) {
              const properties = node.declaration
                ? node.declaration.properties
                : node.expression.right.properties;
              // Look through each of the properties in the object that is being exported.
              properties.forEach(function(property) {
                // If the property is called $trs we have hit paydirt! Some messages for us to grab!
                if (property.key.name === '$trs') {
                  // Grab every message in our $trs property and save it into our messages object.
                  property.value.properties.forEach(function(message) {
                    // Check that the trs id is camelCase.
                    if (!isCamelCase(message.key.name)) {
                      logging.error(
                        `$trs id "${message.key
                          .name}" should be in camelCase. Found in ${module.resource}`
                      );
                    }
                    // Check that the value is valid, and not an expression
                    if (!message.value.value) {
                      logging.error(
                        `The value for $trs "${message.key
                          .name}", is not valid. Make sure it is not an expression. Found in ${module.resource}.`
                      );
                    } else {
                      messages[message.key.name] = message.value.value;
                    }
                  });
                  // We also want to take a note of the name space these messages have been put in too!
                } else if (property.key.name === 'name') {
                  messageNameSpace = property.value.value;
                }
              });
              registerFoundMessages(messageNameSpace, messages, module);
            }
          });
        } else if (
          module.resource &&
          module.resource.indexOf('.js') === module.resource.length - 3 &&
          !module.resource.includes('node_modules')
        ) {
          // Inspect each source file in the chunk if it is a js file too.
          var ast = esprima.parse(module._source.source(), {
            sourceType: 'module',
          });
          var createTranslateFn;
          // First find the reference being used for the create translator function
          ast.body.forEach(node => {
            // Check if an import
            if (
              node.type === esprima.Syntax.ImportDeclaration &&
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
          function traverseTree(node, scopeChain) {
            function getVarScope(name) {
              return scopeChain.find(scope => typeof scope[name] !== 'undefined');
            }
            if (node) {
              if (
                node.type === esprima.Syntax.FunctionDeclaration ||
                node.type === esprima.Syntax.FunctionExpression ||
                node.type === esprima.Syntax.Program
              ) {
                // These node types create a new scope
                scopeChain.unshift({});
              }
              var localScope = scopeChain[0];
              // New declarations only affect the local scope
              if (node.type === esprima.Syntax.VariableDeclaration) {
                node.declarations.forEach(dec => {
                  localScope[dec.id.name] = dec.init;
                });
              }
              // Check if is an expression
              if (
                node.type === esprima.Syntax.ExpressionStatement &&
                // That assigns a value
                node.expression.type === esprima.Syntax.AssignmentExpression &&
                // To a variable
                node.expression.left.type === esprima.Syntax.Identifier &&
                // But only handle equality, because other kinds are difficult to track
                node.expression.operator === '='
              ) {
                // Find the relevant scope where the variable being assigned to is defined
                // If no scope matches, either it is an undeclared variable, or is an ES6
                // style default function parameter, either way, assign to localScope for
                // safety.
                var varScope = getVarScope(node.expression.left.name) || localScope;
                varScope[node.expression.left.name] = node.expression.right;
              }
              if (
                node.type === esprima.Syntax.CallExpression &&
                node.callee.name === createTranslateFn
              ) {
                var messageNameSpace, messages;
                var firstArg = node.arguments[0];
                if (firstArg.type === esprima.Syntax.Literal) {
                  // First argument is a string, get its value directly
                  messageNameSpace = firstArg.value;
                } else if (firstArg.type === esprima.Syntax.Identifier) {
                  // First argument is a variable, lookup in the appropriate scope
                  var varScope = getVarScope(firstArg.name);
                  if (varScope) {
                    messageNameSpace = varScope[firstArg.name].value;
                  } else {
                    logging.warn(
                      `Translator object called with undefined name space argument in ${module.resource}`
                    );
                  }
                }
                var secondArg = node.arguments[1];
                if (secondArg.type === esprima.Syntax.ObjectExpression) {
                  // Second argument is an object, parse this chunk of the AST to get an object back
                  messages = generateMessagesObject(secondArg);
                } else if (secondArg.type === esprima.Syntax.Identifier) {
                  // Second argument is a variable, lookup in the appropriate scope
                  var varScope = getVarScope(secondArg.name);
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
                node.type === esprima.Syntax.FunctionDeclaration ||
                node.type === esprima.Syntax.FunctionExpression ||
                node.type === esprima.Syntax.Program
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
      });
    });
    if (Object.keys(messageExport).length) {
      // If we've got any messages to write out, write them out. Otherwise, don't bother.
      self.writeOutput(messageExport);
      compilation.bundleHasMessages = true;
    } else {
      compilation.bundleHasMessages = false;
    }
    callback();
  });
};

extract$trs.prototype.writeOutput = function(messageExport) {
  // Make sure the directory we are using exists.
  mkdirp.sync(this.messageDir);
  // Write out the data to JSON.
  fs.writeFileSync(
    path.join(this.messageDir, this.messagesName + '-messages.json'),
    JSON.stringify(messageExport)
  );
};

module.exports = extract$trs;
