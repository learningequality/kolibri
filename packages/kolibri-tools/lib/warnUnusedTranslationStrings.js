const espree = require('espree');
const traverse = require('ast-traverse');
const vueCompiler = require('vue-template-compiler');
const logging = require('./logging');

const warnUnusedStrings = vueTemplate => {


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

  const usedDefinitions = [];
  // Check for uses in the <script> portion of the Vue file.

  // Check for uses in the <template> portion of the Vue file.
};

const getDefinedStrings = ast => {
  let definitions = [];
  traverse(ast, {
    pre: node => {
      if(node.type === 'Property') {
        if(node.key.name === '$trs') {
          const nodeDefs = node.value.properties.reduce((defs, prop) => {
            defs.push(prop.key.name);
            return defs;
          }, []);
          definitions = [...definitions, ...nodeDefs]
        }
      }
    },
  });
  return definitions.length > 0 ? definitions : null;
};

module.exports = warnUnusedStrings;
