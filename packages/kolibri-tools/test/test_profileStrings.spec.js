const fs = require('fs');
const path = require('path');
const espree = require('espree');
const vueCompiler = require('vue-template-compiler');
const rewire = require('rewire');

// Rewiring the functions to test.
const ProfileStrings = rewire('../lib/ProfileStrings');
const getStringDefinitions = ProfileStrings.__get__('getStringDefinitions');
const profileVueScript = ProfileStrings.__get__('profileVueScript');
const profileVueTemplate = ProfileStrings.__get__('profileVueTemplate');
const getStringFromNamespaceKey = ProfileStrings.__get__('getStringFromNamespaceKey');
const profileJSFile = ProfileStrings.__get__('profileJSFile');

// Base path for fixtures
const fixturePath = path.resolve(__dirname + '/fixtures/');

describe('getStringDefinitions', function() {
  let moduleName = 'test_module';
  const profile = getStringDefinitions(fixturePath, moduleName);

  it('should return an object with "Translation strings" as keys', function() {
    const expectedStringKeys = ['Hello world', 'Bar', 'Go back', 'Shark do do do do'].sort();
    expect(Object.keys(profile).sort()).toEqual(expectedStringKeys);
  });

  it('should properly store definition namespaces', function() {
    const expectedNamespaceHelloWorld = ['MasterScope', 'OtherScope'].sort();
    const profileHelloWorldNamespaces = profile['Hello world'].definitions
      .map(def => def.namespace)
      .sort();
    expect(profileHelloWorldNamespaces).toEqual(expectedNamespaceHelloWorld);
  });

  it('should properly store definition keys', function() {
    const expectedKeysGoBack = ['returnLabel', 'goBack', 'resurface'].sort();
    const profileGoBackKeys = profile['Go back'].definitions.map(def => def.key).sort();
    expect(expectedKeysGoBack).toEqual(profileGoBackKeys);
  });

  it('should initialize an empty array for all uses', function() {
    Object.keys(profile).forEach(str => {
      expect(profile[str].uses).toEqual([]);
    });
  });
});

describe('getStringFromNamespaceKey', function() {
  let profile = JSON.parse(fs.readFileSync(fixturePath + '/test_component-profile.json'));
  it('returns the proper string for a given namespace and key in the given profile', function() {
    expect(
      getStringFromNamespaceKey(profile, 'TestComponent', 'classPageSubheader', false)
    ).toEqual('View learner progress and class performance');
    expect(getStringFromNamespaceKey(profile, 'CommonCoachStrings', 'classesLabel', true)).toEqual(
      'Classes'
    );
  });
});

describe('profileVueScript', function() {
  // Vue <script> Setup.
  let vueScript = fs.readFileSync(fixturePath + '/TestComponentScript.js');
  let vueScriptAst = espree.parse(vueScript, { sourceType: 'module', ecmaVersion: 2018 });
  let expectedScriptTotalUses = 4;
  let expectedScriptCommonUses = 1;

  // Profile with definitions created manually for the TestComponent.
  let profile = JSON.parse(fs.readFileSync(fixturePath + '/test_component-profile.json'));
  profile = profileVueScript(
    profile,
    vueScriptAst,
    fixturePath + '/TestComponentScript.js',
    'test_component'
  );

  // Gather the uses in an array.
  let allUses = [];
  Object.keys(profile).forEach(k => {
    allUses = [...allUses, ...profile[k].uses];
  });

  it('profiles all uses as expected', function() {
    expect(allUses.length).toEqual(expectedScriptTotalUses);
    expect(allUses.filter(u => u.common).length).toEqual(expectedScriptCommonUses);
  });
});

describe('profileVueTemplate', function() {
  // Vue <template> Setup
  let vueFile = fs.readFileSync(fixturePath + '/TestComponent.vue');
  let vueTemplate = vueCompiler.compile(vueFile.toString());

  // Remove the `with(this) { return` ... `}` bit to avoid issues with AST generation
  const render = vueTemplate.render.replace(/^.{18}|.{1}$/g, '');

  let vueTemplateAst = espree.parse(render, {
    ecmaVersion: '2018',
    sourceType: 'module',
  });

  const expectedTemplateTotalUses = 8;
  const expectedTemplateCommonUses = 5;

  let profile = JSON.parse(fs.readFileSync(fixturePath + '/test_component-profile.json'));
  profile = profileVueTemplate(
    profile,
    vueTemplateAst,
    fixturePath + '/TestComponent.vue',
    'test_component'
  );

  // Gather the uses in an array.
  let allUses = [];
  Object.keys(profile).forEach(k => {
    allUses = [...allUses, ...profile[k].uses];
  });

  it('profiles all uses as expected', function() {
    expect(allUses.length).toEqual(expectedTemplateTotalUses);
    expect(allUses.filter(u => u.common).length).toEqual(expectedTemplateCommonUses);
  });
});

describe('profileJSFile', function() {
  const jsFile = fs.readFileSync(fixturePath + '/TestUserPermissions.js');
  const ast = espree.parse(jsFile.toString(), {
    sourceType: 'module',
  });
  let profile = JSON.parse(fs.readFileSync(fixturePath + '/test_user_permissions-profile.json'));
  profile = profileJSFile(profile, ast, fixturePath + '/TestComponent.vue');

  const expectedTotalUses = 5;
  const expectedGoBackUses = 2;

  // Gather the uses in an array.
  let allUses = [];
  Object.keys(profile).forEach(k => {
    allUses = [...allUses, ...profile[k].uses];
  });

  it('profiles all uses as expected', function() {
    expect(allUses.length).toEqual(expectedTotalUses);
    expect(profile['Go Back'].uses.length).toEqual(expectedGoBackUses);
  });
});
