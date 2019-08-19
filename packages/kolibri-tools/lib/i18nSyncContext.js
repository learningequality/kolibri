// Import packages
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const recast = require('recast');
const traverse = require('ast-traverse');
const get = require('lodash/get');
const parseCsvSync = require('csv-parse/lib/sync');
const vueCompiler = require('vue-template-compiler');
const logging = require('./logging');

// Glob path patterns
// All JS files not in node_modules
const JS_GLOB = path.resolve('./kolibri') + '/!(node_modules)/**/*.js';
// All Vue files not in node_modules
const VUE_GLOB = path.resolve('./kolibri') + '/!(node_modules)/**/*.vue';
// All of the files downloaded from Crowdin
const CSV_PATH = path.resolve('./kolibri/locale/CSV_FILES/');

// -------------------- //
// Processing Functions //
// -------------------- //

const processVueFiles = (files, definitions) => {
  const updatedFiles = [];

  files.forEach(filePath => {
    let fileHasChanged = false;
    const file = fs.readFileSync(filePath);

    // Parse into a SFCDescriptor (includes <template>, <script>, and <style> content)
    const vueSFC = vueCompiler.parseComponent(file.toString(), {
      preserveWhiteSpace: true,
      whitespace: 'preserve',
    });

    // Extract the needed data into an object.
    const compiledVue = {
      // Raw string of everything between <template> tags
      templateContent: get(vueSFC, 'template.content'),
      // Array of attr objects defined on <template> (eg, <template v-if="foo">)
      templateAttrs: get(vueSFC, 'template.attrs'),
      // Raw string of everything between <script> tags
      scriptContent: get(vueSFC, 'script.content'),
      // Array of attr objects defined on <script> (eg, <template type="bar/baz">)
      scriptAttrs: get(vueSFC, 'script.attrs'),
      // Array of all <style> content, attrs, etc. There may be more than 1 <style>
      // definition in a file so we just take it all here and parse it later.
      styles: get(vueSFC, 'styles', []),
    };

    // If we don't have a script, we have no work to do and should leave before breaking something.
    if (!compiledVue.scriptContent) {
      return;
    }

    // Create an AST of the <script> code.
    const scriptAST = recast.parse(compiledVue.scriptContent, {
      parser: require('recast/parsers/babylon'),
      tabWidth: 2,
      reuseWhitspace: false,
    });

    // Traverse the AST and update nodes.
    traverse(scriptAST, {
      pre: node => {
        if (is$trs(node)) {
          // node.value.properties is the object passed to $trs
          node.value.properties = node.value.properties.map(property => {
            const namespace = namespaceFromPath(filePath).replace('.vue', '');
            const key = property.key.name;
            const value = property.value.value;

            const definition = definitions.find(o => o['Identifier'] === `${namespace}.${key}`);

            if (!definition) {
              return property;
            }

            // If we have context, assign an AST objet.
            // If we don't, then  do nothing.
            if (definition['Context'] && definition['Context'] !== '') {
              property.value = objectToAst(definition);
              fileHasChanged = true;
            } else if (definition['Source String'] && property.type === 'ObjectProperty') {
              // We don't have context to add, but we have an ObjectProperty in the codebase
              // so we will convert it back to a regular ol' string.
              property.value = stringAst(definition);
              fileHasChanged = true;
            }
            return property;
          });
        }
      },
    });

    // No need to write the file if it hasn't changed.
    if (fileHasChanged) {
      compiledVue.scriptContent = recast.print(scriptAST, {
        reuseWhitspace: false,
        tabWidth: 2,
      }).code;
      const newFile = compileSFC(compiledVue);
      updatedFiles.push({ [filePath]: newFile });
    }
  });

  return updatedFiles;
};

const processJSFiles = (files, definitions) => {
  const updatedFiles = [];

  files.forEach(filePath => {
    let fileHasChanged = false;

    const file = fs.readFileSync(filePath);

    const ast = recast.parse(file, {
      parser: require('recast/parsers/babylon'),
      tabWidth: 2,
      reuseWhitspace: false,
    });

    // Traverse the AST and update nodes.
    traverse(ast, {
      pre: node => {
        // We only consider updating the node if it is a call to createTranslator()
        if (isCreateTranslator(node)) {
          // The first argument to createTranslator() is the namespace
          const namespace = node.arguments[0].value;
          // The second argument is an ObjectExpression defining the strings.
          const translations = node.arguments[1];

          // Go through all of the properties and update the nodes as needed.
          if (namespace && translations.properties) {
            node.arguments[1].properties = translations.properties.map(property => {
              const key = property.key.name;
              const definition = definitions.find(o => o['Identifier'] === `${namespace}.${key}`);

              if (!definition) {
                // We are mapping all of the properties, so be sure
                // to return the property even if we're not changing it.
                return property;
              }

              // If the definition from the CSV includes context, then we will create
              // and assign an object including the Source string and context.
              // If we don't have context to add or update, we have nothing to change here.
              if (definition['Context'] && definition['Context'] !== '') {
                property.value = objectToAst(definition);
                fileHasChanged = true;
              } else if (definition['Source String'] && property.type === 'ObjectProperty') {
                // We don't have context to add, but we have an ObjectProperty in the codebase
                // so we will convert it back to a regular ol' string.
                property.value = stringAst(definition);
                fileHasChanged = true;
              }
              return property;
            });
          }
        }
      },
    });

    // No need to rewrite the file if we didn't modify it.
    if (fileHasChanged) {
      const newFile = recast.print(ast, { reuseWhitspace: false, tabWidth: 2 }).code;
      updatedFiles.push({ [filePath]: newFile });
    }
  });

  return updatedFiles;
};

// ----------------- //
// Utility Functions //
// ----------------- //

// Given a vueObject, return a formatted string including <template> <script> <style> blocks in order.
const compileSFC = vueObject => {
  const template = compileVueTemplate(vueObject.templateContent, vueObject.templateAttrs);
  const script = compileVueScript(vueObject.scriptContent, vueObject.scriptAttrs);
  const styles = vueObject.styles
    .map(style => {
      return compileVueStyle(style.content, style.lang, style.scoped);
    })
    .join('\n\n');
  // Need to prepend the first <style> definition - but only if there is one.
  const firstStyleNewlines = styles && styles.length ? '\n\n' : '';

  return template + script + firstStyleNewlines + styles;
};

// Given the template string and any relevant attrs on the <template> definition, return the proper
// <template> block of code.
const compileVueTemplate = (template, attrs) => {
  if (template) {
    return `<template${attrsString(attrs)}>${template}</template>\n\n\n`;
  } else {
    return '';
  }
};

// Given the Vue file's <script> and attrs, return the <script> block as a string.
const compileVueScript = (script, attrs) => {
  return `<script${attrsString(attrs)}>${script}</script>\n`;
};

// Layout Vue <style> code and return the properly formatted and attributed <style> block.
const compileVueStyle = (style, lang, scoped) => {
  if (style || style === '') {
    const langDef = lang ? ` lang="${lang}"` : '';
    const scopedText = scoped ? ' scoped' : '';
    return `<style${langDef}${scopedText}>${style}</style>\n`;
  } else {
    return '';
  }
};

// Convert an object containing attr definitions into a string prepended with a space.
// eg, { type: 'javascript/text' } will be returned as ' type="javascript/text"'.
const attrsString = attrs =>
  Object.keys(attrs)
    .map(key => ` ${key}="${attrs[key]}"`)
    .join('');

// Boolean check if a node is a call of the fn 'createTranslator()'
const isCreateTranslator = node => {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'createTranslator'
  );
};

// Boolean check if a node is the definition of $trs in a Vue component.
const is$trs = node => {
  return (
    node.type === 'ObjectProperty' &&
    node.key.name === '$trs' &&
    node.value.type === 'ObjectExpression'
  );
};

// Given a definition, return an ObjectExpression that includes context & string values
// This ought to be assigned to the right-hand value of an ObjectProperty node's `value`
// where the `key` on that ObjectProperty is the `Identifier` used for the defined
// translation string.
const objectToAst = def => {
  return {
    type: 'ObjectExpression',
    properties: [
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'string',
        },
        value: {
          type: 'StringLiteral',
          value: def['Source String'],
        },
      },
      {
        type: 'ObjectProperty',
        key: {
          type: 'Identifier',
          name: 'context',
        },
        value: {
          type: 'StringLiteral',
          value: def['Context'],
        },
      },
    ],
  };
};

// Given a definition, return an ObjectProperty node object with a StringLiteral value.
const stringAst = def => {
  return {
    type: 'StringLiteral',
    value: def['Source String'],
  };
};

// Given a file's path, extract the namespace for that file's strings.
const namespaceFromPath = path => {
  const splitPath = path.split('/');
  const fileName = splitPath[splitPath.length - 1];

  // If the filename is an `index.vue` then it's parent directory name
  // indicates the namespace.
  if (fileName === 'index.vue') {
    return splitPath[splitPath.length - 2];
  } else {
    return splitPath.pop().replace('.vue', '');
  }
};

// Compile all of the defined strings & context from the CSVs that have been downloaded
// from Crowdin.
const parseCSVDefinitions = path => {
  return fs.readdirSync(path).reduce((acc, file, index) => {
    // Skip anything that isn't CSV - needed to avoid loading .po files.
    if (!file.endsWith('.csv')) {
      return acc;
    }
    const filePath = `${path}/${file}`;
    const csvFile = fs.readFileSync(filePath).toString();

    return (acc = [...acc, ...parseCsvSync(csvFile, { skip_empty_lines: true, columns: true })]);
  }, []);
};

// ----------------------- //
// Where The Magic Happens //
// ----------------------- //

if (process.argv.includes('run')) {
  logging.info('Transfering context...');

  const csvDefinitions = parseCSVDefinitions(CSV_PATH);

  // Load the files
  const vueFiles = glob.sync(VUE_GLOB, {});
  const jsFiles = glob.sync(JS_GLOB, {});

  // Get the updated files
  const filesToWrite = processVueFiles(vueFiles, csvDefinitions).concat(
    processJSFiles(jsFiles, csvDefinitions)
  );

  // Write the updated files
  filesToWrite.forEach(fileObj => {
    Object.keys(fileObj).forEach(path => {
      fs.writeFileSync(path, fileObj[path]);
    });
  });

  logging.info('Context transfer has completed!');
}
