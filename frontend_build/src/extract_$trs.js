var esprima = require('esprima');
var logging = require('./logging');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');


function extract$trs(messageDir, messagesName) {
  this.messageDir = messageDir;
  this.messagesName = messagesName;
}

extract$trs.prototype.apply = function(compiler) {

  var self = this;

  compiler.plugin("emit", function(compilation, callback) {
    var messageExport = {};

    compilation.chunks.forEach(function(chunk) {
      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach(function(module) {
        if (module.resource && module.resource.indexOf('.vue') === module.resource.length - 4) {
          // Inspect each source file in the chunk if it is a vue file.
          var messageNameSpace;
          var messages = {};
          // Parse the AST for the Vue file.
          var ast = esprima.parse(module._source.source(), { sourceType: 'module'} );
          ast.body.forEach(function (node) {
            // Look through each top level node until we find the module.exports
            // N.B. this relies on our convention of directly exporting the Vue component
            // with the module.exports, rather than defining it and then setting it to export.

            // Is it an expression?
            if (node.type === 'ExpressionStatement'
              // Is it an assignment expression?
              && node.expression.type === 'AssignmentExpression'
              // Is the first part of the assignment 'module'?
              && ((node.expression.left || {}).object || {}).name == 'module'
              // Is it assining to the 'exports' property of 'module'?
              && ((node.expression.left || {}).property || {}).name == 'exports'
              // Does the right hand side of the assignment expression have any properties?
              // (We don't want to both parsing it if it is an empty object)
              && node.expression.right.properties) {
              // Look through each of the properties in the object that is being exported.
              node.expression.right.properties.forEach(function (property){
                // If the property is called $trs we have hit paydirt! Some messages for us to grab!
                if (property.key.name === '$trs') {
                  // Grab every message in our $trs property and save it into our messages object.
                  property.value.properties.forEach(function(message) {
                    messages[message.key.name] = message.value.value;
                  });
                  // We also want to take a note of the name space these messages have been put in too!
                } else if (property.key.name === '$trNameSpace') {
                  messageNameSpace = property.value.value;
                }
              });
            }
          });
          if (messageNameSpace) {
            // Every message needs to be namespaced - don't pollute our top level!
            Object.keys(messages).forEach(function(key) {
              // Create a new message id from the name space and the message id joined with '.'
              var msgId = messageNameSpace + '.' + key;
              if (messageExport[msgId]) {
                // Warn about duplicate ids *within* a bundle (no way to warn across).
                logging.warn('Duplicate translation id ' + msgId + ' found in ' + module.resource)
              } else {
                // If all is good, save it onto our export object for the whole bundle.
                messageExport[msgId] = messages[key];
              }
            });
            // Someone defined a $trs object, but didn't namespace it - warn them about it here so they can fix their foolishness.
          } else if (Object.keys(messages).length) {
            logging.warn('Translatable messages have been defined in ' + module.resource + ' but no messageNameSpace was specified.');
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
  fs.writeFileSync(path.join(this.messageDir, this.messagesName + '-messages.json'), JSON.stringify(messageExport));
};

module.exports = extract$trs;
