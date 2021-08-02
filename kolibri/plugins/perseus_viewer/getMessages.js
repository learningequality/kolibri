const fs = require('fs');
const path = require('path');
const esprima = require('espree');
const walk = require('walk');

const perseusSourcePath = './submodules/perseus';
const translationUtils = require('./assets/src/translationUtils.js');

const getMessages = converter => {
  return new Promise(resolve => {
    const messages = {};

    function traverseTree(node) {
      let message;
      // Look for messages called with KA's i18n syntax
      // Always take the raw values to preserve escaping,
      // We can let our linting sort it out later.
      if (node.type === esprima.Syntax.CallExpression && node.callee.name === '$_') {
        // Found a message called with '$_'
        message = node.arguments[1].raw;
      }
      if (
        node.type === esprima.Syntax.CallExpression &&
        node.callee.type === esprima.Syntax.MemberExpression &&
        node.callee.object.name === 'i18n' &&
        node.callee.property.name === '_'
      ) {
        // Found a message called with 'i18n._'
        message = node.arguments[0].raw;
      }
      if (message) {
        message = message.toString();
        if (converter) {
          message = converter(message);
        }
        // and set it on the global messages object.
        // No good way to autogenerate a meaningful message id, so just fallback
        // to using the message as the id. Sadness.
        message = translationUtils.escapeBackslashesInString(message);
        // Prevent creation of duplicate keys
        const quoteLessMessage = message.substring(1, message.length - 1);
        if (!messages[`"${quoteLessMessage}"`] && !messages[`'${quoteLessMessage}'`]) {
          messages[message] = message;
        }
      }
      for (var key in node) {
        if (node.hasOwnProperty(key)) {
          var child = node[key];
          if (typeof child === 'object' && child !== null) {
            if (Array.isArray(child)) {
              child.forEach(function(childNode) {
                traverseTree(childNode);
              });
            } else {
              traverseTree(child);
            }
          }
        }
      }
    }

    const walker = walk.walk(perseusSourcePath);

    const blacklist = ['editor', '__tests__', 'perseus/node_modules', 'docs', 'example'];

    walker.on('file', (root, fileStats, next) => {
      if (
        /\.jsx?$/.test(fileStats.name) &&
        !blacklist.some(ban => fileStats.name.includes(ban) || root.includes(ban))
      ) {
        const source = fs.readFileSync(path.join(root, fileStats.name), { encoding: 'utf-8' });
        try {
          const ast = esprima.parse(source, { jsx: true, tolerant: true });
          // Traverse the tree to find all the messages in the perseus built code
          traverseTree(ast);
        } catch (e) {
          console.log('Parsing error in file: ', path.join(root, fileStats.name));
        }
      }
      next();
    });

    walker.on('errors', (root, nodeStatsArray, next) => {
      next();
    });

    walker.on('end', () => {
      resolve(messages);
    });
  });
};

module.exports = getMessages;
