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
          // Explore each source file path that was included into the module:
          var messageNameSpace;
          var messages = {};
          var ast = esprima.parse(module._source.source());
          ast.body.forEach(function (node) {
            if (node.type === 'ExpressionStatement'
              && node.expression.type === 'AssignmentExpression'
              && ((node.expression.left || {}).object || {}).name == 'module'
              && ((node.expression.left || {}).property || {}).name == 'exports'
              && node.expression.right.properties) {
              node.expression.right.properties.forEach(function (property){
                if (property.key.name === '$trs') {
                  property.value.properties.forEach(function(message) {
                    messages[message.key.name] = message.value.value;
                  });
                } else if (property.key.name === '$trNameSpace') {
                  messageNameSpace = property.value.value;
                }
              });
            }
          });
          if (messageNameSpace) {
            Object.keys(messages).forEach(function(key) {
              var msgId = messageNameSpace + '.' + key;
              if (messageExport[msgId]) {
                logging.warn('Duplicate translation id ' + msgId + ' found in ' + module.resource)
              } else {
                messageExport[msgId] = messages[key];
              }
            });
          } else if (Object.keys(messages).length) {
            logging.warn('Translatable messages have been defined in ' + module.resource + ' but no messageNameSpace was specified.');
          }
        }
      });
    });
    self.hash = compilation.hash || '';
    if (Object.keys(messageExport).length) {
      self.writeOutput(messageExport);
    }
    callback();
  });
};

extract$trs.prototype.writeOutput = function(messageExport) {
    mkdirp.sync(this.messageDir);
    fs.writeFileSync(path.join(this.messageDir, this.messagesName + '-' + this.hash + '-messages.json'), JSON.stringify(messageExport));
};

module.exports = extract$trs;
