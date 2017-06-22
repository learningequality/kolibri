const fs = require('fs');
const esprima = require('esprima');
const escodegen = require('escodegen');

function camelKebab(text) {
  return text.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function createImportDeclaration(name, source) {
  name = camelKebab(name);
  return {
    type: 'ImportDeclaration',
    specifiers: [
      {
        type: 'ImportDefaultSpecifier',
        local: { type: 'Identifier', name },
        imported: { type: 'Identifier', name }
      },
    ],
    source,
  };
}

function createComponentProperty(name) {
  name = camelKebab(name);
  return {
    type: 'Property',
    key: { type: 'Identifier', name },
    computed: false,
    value: { type: 'Identifier', name },
    kind: 'init',
    method: false,
    shorthand: true,
  };
}

function readVueFile(file) {
 return fs.readFileSync(file, {encoding: 'utf-8'});
}

function readJSFromVue(text) {
  const start = text.indexOf('<script>') + 8;
  const end = text.indexOf('</script>');
  return text.slice(start, end);
}

function replaceJSinVue(text, code) {
  const start = text.indexOf('<script>') + 8;
  const end = text.indexOf('</script>');
  return text.replace(text.slice(start, end), code);
}

const escodegenOptions = {
  format: {
      indent: {
          style: '  ',
          base: 1,
          adjustMultilineComment: true,
      },
  },
  comment: true,
}

function transformCode(text) {
  const tree = esprima.parse(text, { sourceType: 'module' });
  // Find the export declaration
  const exportDec = tree.body.find(obj => obj.type === esprima.Syntax.ExportDefaultDeclaration);
  // Find the components key
  const components = exportDec.declaration.properties.find(obj => obj.key.name === 'components');
  const importsToAdd = [];
  if (components) {
    // Only check if a components property is found
    components.value.properties.forEach(obj => {
      if (obj.value.callee && obj.value.callee.name === 'require') {
        // Only do this if this is an inline require statement
        const name = obj.key.name || obj.key.value;
        const source = obj.value.arguments[0];
        importsToAdd.push(createImportDeclaration(name, source));
        Object.assign(obj, createComponentProperty(name));
      }
    });
    // Only modify imports and return new code if imports added
    if (importsToAdd.length) {
      const exportIndex = tree.body.findIndex(obj => obj.type === esprima.Syntax.ExportDefaultDeclaration);
      tree.body.splice(exportIndex, 0, ...importsToAdd);
      let code = escodegen.generate(tree, escodegenOptions);
      // Enforce new line separation in script block
      code = code.replace(/^(\n)*/, '\n\n');
      code = code.replace(/(\n)*$/, '\n\n');
      return code;
    }
  }
  // Otherwise, just return the original code block with no changes
  return text;
}

function transformVueFile(file) {
  const text = readVueFile(file);
  if (text.indexOf('<script>') > - 1) {
    const code = transformCode(readJSFromVue(text));
    const newText = replaceJSinVue(text, code);
    return newText;
  }
  return text;
}

function rewriteVueFile(file) {
  fs.writeFileSync(file, transformVueFile(file), { encoding: 'utf-8' });
}

if (require.main === module) {
  const program = require('commander');
  const glob = require('glob');

  program
    .version('0.0.1')
    .usage('[options] <file>')
    .arguments('<file>')
    .option('-w, --write', 'Write to file', false)
    .parse(process.argv);
  const file = program.args[0];
  const processFile = file => {
    if (!program.write) {
      console.log(transformVueFile(file));
    } else {
      rewriteVueFile(file);
    }
  }
  if (!file) {
    program.help();
  } else {
    if (glob.hasMagic(file)) {
      glob(file, (err, matches) => {
        if (err) {
          console.log('Error: ', err);
        } else {
          matches.forEach(processFile);
        }
      });
    } else {
      processFile(file);
    }
  }
}

module.exports = {
  transformVueFile,
  readVueFile,
  transformCode,
};
