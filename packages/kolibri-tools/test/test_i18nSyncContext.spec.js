const fs = require('fs');
const path = require('path');
const vueCompiler = require('vue-template-compiler');
const traverse = require('ast-traverse');
const recast = require('recast');
const rewire = require('rewire');

const vueCompilerOptions = {
  preserveWhiteSpace: true,
  whitespace: 'preserve',
};

const recastOptions = {
  parser: require('recast/parsers/babylon'),
  tabWidth: 2,
  reuseWhitespace: false,
};

// Rewiring the functions to test.
const i18nSyncContext = rewire('../lib/i18nSyncContext');
const isCreateTranslator = i18nSyncContext.__get__('isCreateTranslator');
const is$trs = i18nSyncContext.__get__('is$trs');
const processVueFiles = i18nSyncContext.__get__('processVueFiles');
const processJSFiles = i18nSyncContext.__get__('processJSFiles');
const parseCSVDefinitions = i18nSyncContext.__get__('parseCSVDefinitions');

// File loading.
const fixturePath = path.resolve(__dirname + '/fixtures/i18nSyncContext');
// Vue file with simple string definitions only.
const Vue1Path = path.resolve(fixturePath + '/Context01.vue');
const Vue1 = fs.readFileSync(Vue1Path);
const VueSFC1 = vueCompiler.parseComponent(Vue1.toString(), vueCompilerOptions);
const vueScript1 = VueSFC1.script.content;

// Vue file with object defining context for a string.
const Vue2Path = path.resolve(fixturePath + '/Context02.vue');
const Vue2 = fs.readFileSync(Vue2Path);
const VueSFC2 = vueCompiler.parseComponent(Vue2.toString(), vueCompilerOptions);
const vueScript2 = VueSFC2.script.content;

// JS file defining strings with no context only.
const JS1Path = path.resolve(fixturePath + '/CommonContextStrings01.js');
const JS1 = fs.readFileSync(JS1Path);

// JS file definiing strings that DO INCLUDE context definitions.
const JS2Path = path.resolve(fixturePath + '/CommonContextStrings02.js');
const JS2 = fs.readFileSync(JS2Path);

const VueFilePaths = [Vue1Path, Vue2Path];
const JSFilePaths = [JS1Path, JS2Path];

// Load context files. Each lives in a folder describing it's contents.
// parseCSVDefinitions() takes a directory path and gets all CSVs, which
// is why each file has its own directory.
const noContextDefs = parseCSVDefinitions(fixturePath + '/csv-no-context');
const newContextDefs = parseCSVDefinitions(fixturePath + '/csv-new-context');

/**
 * Actual Tests
 */

describe('is$trs() during node traversal', function() {
  const vueAst = recast.parse(vueScript1, recastOptions);
  let countVue$trs = 0;
  const jsAst = recast.parse(JS1, recastOptions);
  let countJS$trs = 0;

  it('should return true when reaching a node with a property key called `$trs`', function() {
    traverse(vueAst, {
      pre: node => {
        if (is$trs(node)) {
          countVue$trs += 1;
        }
      },
    });
    // Can only be one.
    expect(countVue$trs).toEqual(1);
  });

  it('should never return true if there is no object with an $trs property', function() {
    traverse(jsAst, {
      pre: node => {
        if (is$trs(node)) {
          countJS$trs += 1;
        }
      },
    });
    // Should certainly be zero, even though there is a function called $trs in that file.
    expect(countJS$trs).toEqual(0);
  });
});

describe('isCreateTranslator() during node traversal', function() {
  // No calls to createTranslator in this Vue file.
  const vueAst1 = recast.parse(vueScript1, recastOptions);
  let countVue1 = 0;

  it('should always return false for nodes that are not calling createTranslator', function() {
    traverse(vueAst1, {
      pre: node => {
        if (isCreateTranslator(node)) {
          countVue1 += 1;
        }
      },
    });
    expect(countVue1).toEqual(0);
  });

  // This file includes a call to createTranslator
  const vueAst2 = recast.parse(vueScript2, recastOptions);
  let countVue2 = 0;

  it('should return true if found in a Vue file', function() {
    traverse(vueAst2, {
      pre: node => {
        if (isCreateTranslator(node)) {
          countVue2 += 1;
        }
      },
    });
    expect(countVue2).toEqual(1);
  });

  // This file includes a single call to createTranslator.
  const jsAst1 = recast.parse(JS1, recastOptions);
  let countJS1 = 0;

  it('should count multiple calls', function() {
    traverse(jsAst1, {
      pre: node => {
        if (isCreateTranslator(node)) {
          countJS1 += 1;
        }
      },
    });
    expect(countJS1).toEqual(1);
  });

  // This file includes two calls to createTranslator
  const jsAst2 = recast.parse(JS2, recastOptions);
  let countJS2 = 0;

  it('should return true if found in a Vue file', function() {
    traverse(jsAst2, {
      pre: node => {
        if (isCreateTranslator(node)) {
          countJS2 += 1;
        }
      },
    });
    expect(countJS2).toEqual(2);
  });
});

describe('processVueFiles', function() {
  it('returns an empty array when no files change', function() {
    // Note: Passing [] for definitions means nothing ought to change.
    const unchanged = processVueFiles(VueFilePaths, []);
    expect(unchanged).toEqual([]);
  });

  // ** Remove ObjectExpression & insert StringLiteral/TemplateLiteral, when no context exists ** //
  // noContextDefs defines that no strings should have any context. We therefore
  // expect that the updated files will have no objects defined for strings and
  // that all right-side values in $trs are (String|Template)Literal nodes.
  const noContextUpdatedFiles = processVueFiles(VueFilePaths, noContextDefs);

  it('returns an array of objects mapping filepaths (key) to changed files', function() {
    noContextUpdatedFiles.forEach(delta => {
      expect(fs.existsSync(Object.keys(delta)[0])).toEqual(true);
    });
  });

  it('removes context that were previously defined if empty in definitions', function() {
    // Ensure that context was removed from all of the files.
    const checkForNoContext = property => {
      expect(
        property.value.type === 'StringLiteral' || property.value.type === 'TemplateLiteral'
      ).toEqual(true);
    };
    noContextUpdatedFiles.forEach(delta => {
      const path = Object.keys(delta)[0];
      testVueProperties(delta[path], checkForNoContext);
    });
  });

  // ** Insert ObjectExpression, with context, when context found in definitions ** //
  // In the newContextDefs, there are 2 definitions which should have context added
  // with the value "Added Context"
  // Also - this ensures that old contexts are overwritten by new ones.
  const ADDED_CONTEXT = 'Added Context';
  const newContextUpdatedFiles = processVueFiles(VueFilePaths, newContextDefs);
  it('updates context definitions to match the definitions given', function() {
    const checkForUpdatedContext = property => {
      // Ensure every property has an object assigned to it
      expect(property.value.type).toEqual('ObjectExpression');

      const contexts = property.value.properties.filter(p => p.key.name === 'context');
      const messages = property.value.properties.filter(p => p.key.name === 'message');
      // Ensure that every object has a `messages` and `context` key
      expect(contexts.length).toBeGreaterThan(0);
      expect(messages.length).toBeGreaterThan(0);
      expect(contexts.length).toEqual(messages.length);

      // Ensure all of the contexts are the "Added Context" defined in the CSV.
      contexts.forEach(c => expect(c.value.value).toEqual(ADDED_CONTEXT));
    };
    newContextUpdatedFiles.forEach(delta => {
      const path = Object.keys(delta)[0];
      testVueProperties(delta[path], checkForUpdatedContext);
    });
  });
});

describe('processJSFiles', function() {
  it('returns an empty array when no files change', function() {
    // Note: Passing [] for definitions means nothing ought to change.
    const unchanged = processJSFiles(JSFilePaths, []);
    expect(unchanged).toEqual([]);
  });

  // ** Remove ObjectExpression & insert StringLiteral/TemplateLiteral, when no context exists ** //
  // noContextDefs defines that no messages should have any context. We therefore
  // expect that the updated files will have no objects defined for messages and
  // that all right-side values in $trs are (String|Template)Literal nodes.
  const noContextUpdatedFiles = processJSFiles(JSFilePaths, noContextDefs);

  it('returns an array of objects mapping filepaths (key) to changed files', function() {
    noContextUpdatedFiles.forEach(delta => {
      expect(fs.existsSync(Object.keys(delta)[0])).toEqual(true);
    });
  });

  it('removes context that were previously defined if empty in definitions', function() {
    // Ensure that context was removed from all of the files.
    const checkForNoContext = property => {
      expect(
        property.value.type === 'StringLiteral' || property.value.type === 'TemplateLiteral'
      ).toEqual(true);
    };
    noContextUpdatedFiles.forEach(delta => {
      const path = Object.keys(delta)[0];
      testJSProperties(delta[path], checkForNoContext);
    });
  });

  // ** Insert ObjectExpression, with context, when context found in definitions ** //
  // In the newContextDefs, there are 2 definitions which should have context added
  // with the value "Added Context"
  // Also - this ensures that old contexts are overwritten by new ones.
  const ADDED_CONTEXT = 'Added Context';
  const newContextUpdatedFiles = processJSFiles(JSFilePaths, newContextDefs);
  it('updates context definitions to match the definitions given', function() {
    const checkForUpdatedContext = property => {
      // Ensure every property has an object assigned to it
      expect(property.value.type).toEqual('ObjectExpression');

      const contexts = property.value.properties.filter(p => p.key.name === 'context');
      const messages = property.value.properties.filter(p => p.key.name === 'message');
      // Ensure that every object has a `message` and `context` key
      expect(contexts.length).toBeGreaterThan(0);
      expect(messages.length).toBeGreaterThan(0);
      expect(contexts.length).toEqual(messages.length);

      // Ensure all of the contexts are the "Added Context" defined in the CSV.
      contexts.forEach(c => expect(c.value.value).toEqual(ADDED_CONTEXT));
    };
    newContextUpdatedFiles.forEach(delta => {
      const path = Object.keys(delta)[0];
      testJSProperties(delta[path], checkForUpdatedContext);
    });
  });
});

/** Utils */

// Given a Vue file, this function will load that file, create an AST and will
// pass every $trs object property to the given callback.
const testVueProperties = (vueFile, callback) => {
  const vueSFC = vueCompiler.parseComponent(vueFile, {
    preserveWhiteSpace: true,
    whitespace: 'preserve',
  });

  const script = vueSFC.script.content;

  const ast = recast.parse(script, {
    parser: require('recast/parsers/babylon'),
    tabWidth: 2,
    reuseWhitspace: false,
  });

  traverse(ast, {
    pre: node => {
      if (is$trs(node)) {
        node.value.properties.forEach(property => {
          callback(property);
        });
      }
    },
  });
};

// Given a JS file, this function will load that file, create an AST and will
// pass every property of the object passed as the second argument to the
// createTranslatorFunction (similar to the testVueProperties fn above)
const testJSProperties = (jsFile, callback) => {
  const ast = recast.parse(jsFile, {
    parser: require('recast/parsers/babylon'),
    tabWidth: 2,
    reuseWhitspace: false,
  });
  traverse(ast, {
    pre: node => {
      if (isCreateTranslator(node)) {
        // node.arguments[1] refers to the object passed to createTranslator
        // which will be an ObjectExpression node
        node.arguments[1].properties.forEach(property => {
          callback(property);
        });
      }
    },
  });
};
