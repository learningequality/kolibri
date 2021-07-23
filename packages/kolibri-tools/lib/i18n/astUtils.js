const recast = require('recast');
const babylonParser = require('recast/parsers/babylon');
const traverse = require('ast-traverse');
const { CONTEXT_LINE } = require('./constants');

function parseAST(scriptContent) {
  return recast.parse(scriptContent, {
    parser: babylonParser,
    tabWidth: 2,
    reuseWhitespace: false,
  });
}

function printAST(ast) {
  return recast.print(ast, { reuseWhitspace: false, tabWidth: 2, quote: 'single' }).code;
}

function getVueSFCName(ast) {
  let messageNamespace;

  const nameSpaceFoundMsg = 'Namespace found!';
  try {
    traverse(ast, {
      pre: node => {
        if (node.type === 'ObjectProperty') {
          if (node.key.name === 'name') {
            messageNamespace = node.value.value;
          }
        }
        if (messageNamespace) {
          throw new Error(nameSpaceFoundMsg);
        }
      },
    });
  } catch (e) {
    if (e.message !== nameSpaceFoundMsg) {
      throw e;
    }
  }
  return messageNamespace;
}

// boolean check for if a node is where the $trs are defined in a Vue SFC
function is$trs(node) {
  return (
    node.type === 'ObjectProperty' &&
    node.key.name === '$trs' &&
    node.value.type === 'ObjectExpression'
  );
}

// boolean check if a node is a call of the fn 'createTranslator()'
function isCreateTranslator(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'createTranslator'
  );
}

// Given a definition, return the value node for a StringLiteral
function stringLiteralNode(def) {
  return {
    type: 'StringLiteral',
    value: def['Source String'],
  };
}

// Given a definition, return the value node for a TemplateLiteral
function templateLiteralNode(def) {
  return {
    type: 'TemplateLiteral',
    quasis: [
      {
        type: 'TemplateElement',
        tail: true,
        value: {
          raw: def['Source String'],
          cooked: def['Source String'],
        },
      },
    ],
    expressions: [],
  };
}

// Given the defined context string, return it without the appended identifier
function extractContext(context) {
  const splitContext = context.split(CONTEXT_LINE);
  return splitContext[splitContext.length - 1];
}

// Given a definition, return an ObjectExpression that includes context & string values
// This ought to be assigned to the right-hand value of an ObjectProperty node's `value`
// where the `key` on that ObjectProperty is the `Identifier` used for the defined
// translation string.
function objectToAst(def, valueIsTemplateNode = false) {
  const sourceStringValue = valueIsTemplateNode ? templateLiteralNode(def) : stringLiteralNode(def);
  return {
    type: 'ObjectExpression',
    properties: [
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'message',
        },
        value: sourceStringValue,
      },
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'context',
        },
        value: {
          type: 'StringLiteral',
          value: extractContext(def['Context']),
        },
      },
    ],
  };
}

module.exports = {
  getVueSFCName,
  parseAST,
  printAST,
  is$trs,
  isCreateTranslator,
  objectToAst,
  stringLiteralNode,
  templateLiteralNode,
  extractContext,
};
