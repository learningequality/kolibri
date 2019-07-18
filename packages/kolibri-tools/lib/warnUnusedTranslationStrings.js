const espree = require('espree');
const traverse = require('ast-traverse');
const vueCompiler = require('vue-template-compiler');
const logging = require('./logging');

const warnUnusedStrings = (vueTemplate, filePath) => {
  const scriptAST = espree.parse(vueTemplate.script.content, {
    sourceType: 'module',
    ecmaVersion: 2018,
  });

  const vueCompilerAST = vueCompiler.compile(vueTemplate.template.content);
  const template = vueCompilerAST.render.replace(/^.{18}|.{1}$/g, '');

  const templateAST = espree.parse(template, {
    ecmaVersion: '2018',
    sourceType: 'module',
    ecmaFeatures: { templateStrings: true },
  });

  // Get defined $trs, if any.
  const definitions = getDefinedStrings(scriptAST);
  // Bail if there aren't defined strings.
  if (!definitions) {
    return;
  }

  let uses = [];
  // Check for uses in the <script> portion of the Vue file.
  const scriptUses = getStringUsesFromScript(scriptAST);
  if (scriptUses) {
    uses = [...uses, ...scriptUses];
  }

  // Check for uses in the <template> portion of the Vue file.
  const templateUses = getStringUsesFromTemplate(templateAST);
  if (templateUses) {
    uses = [...uses, ...templateUses];
  }

  // Filter out unused strings that may be assigned to an Array,
  // or an object mapping property's value. This would only happen
  // in the <script> section's AST.
  const dynamicUses = getDynamicUses(scriptAST, definitions);

  // Compare uses vs definitions
  const unusedStrings = definitions.filter(
    str => !uses.includes(str) && !dynamicUses.includes(str)
  );
  unusedStrings.forEach(str => {
    logging.warn(`Unused string "${str}" in ${filePath}.`);
  });
};

const getDefinedStrings = ast => {
  let definitions = [];
  traverse(ast, {
    pre: node => {
      if (node.type === 'Property') {
        if (node.key.name === '$trs') {
          const nodeDefs = node.value.properties.reduce((defs, prop) => {
            defs.push(prop.key.name);
            return defs;
          }, []);
          definitions = [...definitions, ...nodeDefs];
        }
      }
    },
  });
  return definitions.length > 0 ? definitions : null;
};

const getStringUsesFromScript = ast => {
  let uses = [];
  traverse(ast, {
    pre: node => {
      // The CallExpressions will find all potential $tr and commont$tr calls.
      if (node.type === 'CallExpression') {
        if (node.callee.property) {
          if (node.callee.property.type === 'Identifier') {
            // Check for a call to a function *$tr
            if (node.callee.property.name.includes('$tr')) {
              const key = keyFromArguments(node.arguments);
              if (key) {
                uses.push(key);
              }
            }
          }
        }
      }
    },
  });
  return uses.length > 0 ? uses : null;
};

const getStringUsesFromTemplate = ast => {
  let uses = [];
  traverse(ast, {
    pre: node => {
      // The CallExpressions will find all potential $tr and commont$tr calls.
      if (node.type === 'CallExpression') {
        if (node.callee.type === 'Identifier') {
          // Check for a call to a function *$tr
          if (node.callee.name.includes('$tr')) {
            const key = keyFromArguments(node.arguments);
            if (key) {
              uses.push(key);
            }
          }
        }
      }
    },
  });
  return uses.length > 0 ? uses : null;
};

const getDynamicUses = (ast, definitions) => {
  // Storing uses which are defined in an array or an object, which
  // means they may be used in a mapping or iterator.
  let dynamicUses = [];
  traverse(ast, {
    pre: node => {
      // Check for Object expressions where a translation key is mapped
      // to an object and, possibly, called in a $tr() by referring
      // to the object mapping.
      if (node.type === 'ObjectExpression') {
        if (node.properties) {
          node.properties.forEach(prop => {
            if (prop.value && definitions.includes(prop.value.value)) {
              dynamicUses.push(prop.value.value);
            }
          });
        }
      }

      // Check for Arrays where the uses are included in them - which
      // is a fair indicator that the string is used in an iterator.
      if (node.type === 'ArrayExpression') {
        node.elements.forEach(elem => {
          if (definitions.includes(elem.value)) {
            dynamicUses.push(elem.value);
          }
        });
      }
    },
  });
  return dynamicUses;
};

// Given a node's array of arguments, extract and return the key... or null no dice.
const keyFromArguments = args => {
  let key = null;
  if (args && Array.isArray(args)) {
    if (args.length > 0) {
      if (args[0].type === 'Literal') {
        key = args[0].value;
      }
    }
  }
  return key;
};

module.exports = warnUnusedStrings;
