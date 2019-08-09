// Import packages
const fs = require('fs');
const path = require('path');
const url = require('url');
const util = require('util');
const glob = require('glob');
const espree = require('espree');
const recast = require('recast');
const traverse = require('ast-traverse');
const escodegen = require('escodegen');
const get = require('lodash/get');
const parseCsvSync = require('csv-parse/lib/sync');
const vueCompiler = require('vue-template-compiler');
const logging = require('./logging');

const JS_GLOB = path.resolve('./kolibri') + '/!(node_modules)/**/common*Strings.js';
const VUE_GLOB = path.resolve('./kolibri') + '/!(node_modules)/**/*.vue';
const CSV_PATH = path.resolve('./kolibri/locale/CSV_FILES');

// -------------------- //
// Processing Functions //
// -------------------- //

const processVueFiles = (err, files) => {
  files.forEach(filePath => {
    // Load the file
    const file = fs.readFileSync(filePath);

    // Parse into a SFCDescriptor (includes <template>, <script>, and <style> content)
    const vueSFC = vueCompiler.parseComponent(file.toString());

    // Extract the raw code for each of the three parts + the lang definition on the <style> tag.
    const template = get(vueSFC, 'template.content');
    const script = get(vueSFC, 'script.content');
    const style = get(vueSFC, 'styles[0].content', '');
    const styleLang = get(vueSFC, 'styles[0].lang', null);

    // If we don't have a script, we have no work to do and should leave before breaking something.
    if (!script) {
      return;
    }

    // Create an AST of the <script> code.
    const scriptAST = espree.parse(script, {
      ecmaVersion: 2018,
      sourceType: 'module',
    });

    // Traverse the AST and update nodes.
    traverse(scriptAST, {
      pre: node => {
        if (is$trs(node)) {
          // node.value.properties -> Object properties.
          node.value.properties = node.value.properties.map(property => {
            // TODO - Refactor filenamefrompath - go up a directory when you get index.vue
            const namespace = filenameFromPath(filePath).replace('.vue', '');
            const key = property.key.name;
            const value = property.value.value;

            const definition = definitions.find(o => o['Identifier'] === `${namespace}.${key}`);

            if (!definition) {
              return property;
            }

            // If we have context, assign an AST objet.
            // If we don't, then  do nothing.
            if (definition['Context'] && definition['Context'] !== '') {
              property.value = objectToAst({
                string: definition['Source String'],
                context: definition['Context'],
              });
            }
            return property;
          });
        }
      },
    });

    // Parse the AST back into proper JS code.
    const updatedScript = escodegen.generate(scriptAST);
    const newFile = compileSFC(template, updatedScript, style, styleLang);
    fs.writeFileSync(filePath, newFile);
  });
};

const processJSFiles = (err, files) => {
  files.forEach(filePath => {
    const file = fs.readFileSync(filePath);

    const ast = espree.parse(file, {
      ecmaVersion: 2018,
      sourceType: 'module',
    });
    // Traverse the AST and update nodes.
    traverse(ast, {
      pre: node => {
        if (isCreateTranslator(node)) {
          const namespace = node.arguments[0];
          const translations = node.arguments[1];

          if (namespace && translations.properties) {
            node.arguments[1].properties = translations.properties.map(property => {
              const key = property.key.name;
              const definition = definitions.find(o => o['Identifier'] === `${namespace}.${key}`);

              if (!definition) {
                return property;
              }

              // If we have context, assign an AST objet.
              // If we don't, then  do nothing.
              if (definition['Context'] && definition['Context'] !== '') {
                property.value = objectToAst({
                  string: definition['Source String'],
                  context: definition['Context'],
                });
              }
              return property;
            });
          }
        }
      },
    });
    const newFile = escodegen.generate(ast);
    fs.writeFileSync(filePath, newFile);
  });
};

// ---------------- //
// Helper Functions //
// ---------------- //

const definitions = fs.readdirSync(CSV_PATH).reduce((acc, file, index) => {
  // Skip anything that isn't CSV
  if (!file.endsWith('.csv')) {
    return acc;
  }
  const filePath = `${CSV_PATH}/${file}`;
  const csvFile = fs.readFileSync(filePath).toString();

  return (acc = [...acc, ...parseCsvSync(csvFile, { skip_empty_lines: true, columns: true })]);
}, []);

const compileSFC = (template, script, style, styleLang) => {
  return (
    compileVueTemplate(template) +
    compileVueScript(script) +
    (Boolean(style) && compileVueStyle(style, styleLang))
  );
};

const compileVueTemplate = template => `<template>${template}</template>\n\n`;

const compileVueScript = script => `<script>${script}</script>\n`;

// Layout Vue <style> code
const compileVueStyle = (style, lang) => {
  const langDef = lang ? ` lang='${lang}'` : '';
  return `\n<style${langDef}>${style}</style>\n`;
};

// Boolean check if a node is a call of the fn 'createTranslator()'
const isCreateTranslator = node => {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'createTranslator'
  );
};

const is$trs = node => {
  return (
    node.type === 'Property' && node.key.name === '$trs' && node.value.type === 'ObjectExpression'
  );
};

// Given an object { string: '', context: '', etc: ''} return an AST object for it.
const objectToAst = obj => {
  const properties = Object.keys(obj).map(key => {
    return {
      type: 'Property',
      key: {
        type: 'Identifier',
        name: key,
      },
      value: {
        type: 'Literal',
        value: obj[key],
      },
    };
  });
  return {
    type: 'ObjectExpression',
    properties,
  };
};

const filenameFromPath = path => {
  const splitPath = path.split('/');
  return splitPath[splitPath.length - 1];
};

// BONUS FUNCTION
// If we every opt to decide that all definitions should be objects, then this
// fn will return an object AST assigning `str` passed to it like so:
// { string: str } - since there is no context, there is no need to include it.
const stringToObjectAst = str => {
  return {
    type: 'ObjectExpression',
    properties: [
      {
        type: 'Property',
        key: {
          type: 'Identifier',
          name: 'string',
        },
        value: {
          type: 'Literal',
          value: str,
        },
      },
    ],
  };
};

// ----------------------- //
// Where The Magic Happens //
// ----------------------- //

glob(VUE_GLOB, {}, processVueFiles);
glob(JS_GLOB, {}, processJSFiles);

logging.info('Context transfer has completed!');
