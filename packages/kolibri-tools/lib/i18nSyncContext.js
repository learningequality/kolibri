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
// Constant for where we will split context strings
const CONTEXT_LINE = require('./ExtractStrings').CONTEXT_LINE;

// Regex for finding open and close <script> tags
// Will match full line unless there is a character on that line prior
// to the script tag (ie, if it is commented out).
const reScriptOpen = /^[ ]*<script[^>]*>/;
const reScriptClose = /^[ ]*<\/script>/;

// Glob path patterns
// All JS files not in node_modules
const JS_GLOB = path.resolve('./kolibri') + '/**/*.js';
// All Vue files not in node_modules
const VUE_GLOB = path.resolve('./kolibri') + '/**/*.vue';
// We only need one set of languages - since we have the ACH
// which is a Crowdin placeholder language, we'll go there to
// get the Context.
const CSV_PATH = path.resolve('./kolibri/locale/CSV_FILES/ach/');

// -------------------- //
// Processing Functions //
// -------------------- //

function processVueFiles(files, definitions) {
  const updatedFiles = [];

  files.forEach(filePath => {
    if (filePath.includes('node_modules')) {
      return;
    }
    let fileHasChanged = false;
    const file = fs.readFileSync(filePath);

    // Parse into a SFCDescriptor (includes <template>, <script>, and <style> content)
    const vueSFC = vueCompiler.parseComponent(file.toString(), {
      preserveWhiteSpace: true,
      whitespace: 'preserve',
    });

    let scriptContent = get(vueSFC, 'script.content');

    // If we don't have a script, we have no work to do and should leave before breaking something.
    if (!scriptContent) {
      return;
    }

    // Create an AST of the <script> code.
    const scriptAST = recast.parse(scriptContent, {
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

            const definition = definitions.find(o => o['Identifier'] === `${namespace}.${key}`);

            if (!definition) {
              return property;
            }

            // If we have context, assign an AST objet.
            // If we don't, then  do nothing.
            if (definition['Context'] && extractContext(definition['Context']) !== '') {
              property.value = objectToAst(definition, property.value.type === 'TemplateLiteral');
              fileHasChanged = true;
            } else if (definition['Source String'] && property.value.type === 'ObjectProperty') {
              // We don't have context to add, but we have an ObjectProperty in the codebase
              // so we will convert it back to a regular ol' string.
              property.value =
                property.value.type === 'TemplateLiteral'
                  ? templateLiteralNode(definition)
                  : stringLiteralNode(definition);
              fileHasChanged = true;
            }
            return property;
          });
        }
      },
    });

    // No need to write the file if it hasn't changed.
    if (fileHasChanged) {
      const updatedScript = recast.print(scriptAST, {
        reuseWhitspace: false,
        tabWidth: 2,
        quote: 'single',
      }).code;
      const newFile = injectNewScript(file.toString(), updatedScript);
      updatedFiles.push({ [filePath]: newFile });
    }
  });

  return updatedFiles;
}

function processJSFiles(files, definitions) {
  const updatedFiles = [];

  files.forEach(filePath => {
    if (filePath.includes('node_modules')) {
      return;
    }
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
              if (definition['Context'] && extractContext(definition['Context']) !== '') {
                property.value = objectToAst(definition, property.value.type === 'TemplateLiteral');
                fileHasChanged = true;
              } else if (definition['Source String'] && property.value.type === 'ObjectProperty') {
                // We don't have context to add, but we have an ObjectProperty in the codebase
                // so we will convert it back to a regular ol' string.
                property.value =
                  property.value.type === 'TemplateLiteral'
                    ? templateLiteralNode(definition)
                    : stringLiteralNode(definition);
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
      const newFile = recast.print(ast, { reuseWhitspace: false, tabWidth: 2, quote: 'single' })
        .code;
      updatedFiles.push({ [filePath]: newFile });
    }
  });

  return updatedFiles;
}

// ----------------- //
// Utility Functions //
// ----------------- //

// Replaces the body of <script> tags in a Vue file and replaces its content
// with that which is passed to the function.
function injectNewScript(file, content) {
  // Make both items an array of lines.
  const lines = file.split('\n');
  const contentLines = content.split('\n');

  // Will store the index positions for the open and close <script> tags.
  let open;
  let close;

  lines.forEach((line, i) => {
    // Test each line to find the opening <script...> tag
    if (reScriptOpen.test(line)) {
      open = i + 1; // Add one so the index includes the matched <script>
      return;
    }
    // Test each line to find the closing </script> tag
    if (reScriptClose.test(line)) {
      close = i - 1; // Take one away to ensure inclusion of </script>
      return;
    }
  });

  // Everything up to and including the opening <script> tag.
  const top = lines.slice(0, open);
  // Everything from (inclusively) the </script> tag to EOF.
  const bottom = lines.slice(close);

  // Combine the three arrays and append the newline Vue files need.
  return [...top, ...contentLines, ...bottom].join('\n');
}

// Boolean check if a node is a call of the fn 'createTranslator()'
function isCreateTranslator(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'createTranslator'
  );
}

// Boolean check if a node is the definition of $trs in a Vue component.
function is$trs(node) {
  return (
    node.type === 'ObjectProperty' &&
    node.key.name === '$trs' &&
    node.value.type === 'ObjectExpression'
  );
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

// Given a file's path, extract the namespace for that file's strings.
function namespaceFromPath(path) {
  const splitPath = path.split('/');
  const fileName = splitPath[splitPath.length - 1];

  // If the filename is an `index.vue` then it's parent directory name
  // indicates the namespace.
  if (fileName === 'index.vue') {
    return splitPath[splitPath.length - 2];
  } else {
    return splitPath.pop().replace('.vue', '');
  }
}

// Given the defined context string, return it without the appended identifier
function extractContext(context) {
  const splitContext = context.split(CONTEXT_LINE);
  return splitContext[splitContext.length - 1];
}

// Compile all of the defined strings & context from the CSVs that have been downloaded
// from Crowdin.
function parseCSVDefinitions(path) {
  return fs.readdirSync(path).reduce((acc, file) => {
    // Skip anything that isn't CSV - needed to avoid loading .po files.
    if (!file.endsWith('.csv')) {
      return acc;
    }
    const filePath = `${path}/${file}`;
    const csvFile = fs.readFileSync(filePath).toString();

    return (acc = [...acc, ...parseCsvSync(csvFile, { skip_empty_lines: true, columns: true })]);
  }, []);
}

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
