const fs = require('fs');
const path = require('path');
const espree = require('espree');
const vueCompiler = require('vue-template-compiler');
const rewire = require('rewire');
const profile$trs = rewire('../lib/profile$trs');

const getStringDefinitions = profile$trs.__get__('getStringDefinitions');
const profileVueScript = profile$trs.__get__('profileVueScript');
const profileVueTemplate = profile$trs.__get__('profileVueTemplate');
const fixturePath = path.resolve(__dirname + '/fixtures/');

describe("getStringDefinitions", function() {
    let moduleName = "test_module";
    const profile = getStringDefinitions(fixturePath, moduleName);

    it('should return an object with "Translation strings" as keys', function() {
        const expectedStringKeys = [
            "Hello world",
            "Bar",
            "Go back",
            "Shark do do do do",
        ].sort();

        expect(Object.keys(profile).sort()).toEqual(expectedStringKeys);
    });

    it('should properly store definition namespaces', function() {
        const expectedNamespaceHelloWorld = [
            "MasterScope",
            "OtherScope"
        ].sort();
        const profileHelloWorldNamespaces = profile["Hello world"].definitions.map(def => def.namespace).sort();
        expect(profileHelloWorldNamespaces).toEqual(expectedNamespaceHelloWorld);
    });

    it('should properly store definition keys', function() {
        const expectedKeysGoBack = [
            "returnLabel",
            "goBack",
            "resurface"
        ].sort();
        const profileGoBackKeys = profile["Go back"].definitions.map(def => def.key).sort();
        expect(expectedKeysGoBack).toEqual(profileGoBackKeys);
    })

    it('should initialize an empty array for all uses', function() {
        Object.keys(profile).forEach(str => {
            expect(profile[str].uses).toEqual([]);
        })
    });
});

describe("profileVueScript", function() {
  // Vue <script> Setup.
  let vueScript = fs.readFileSync(fixturePath + '/TestComponentScript.js');
  let vueScriptAst = espree.parse(vueScript, { sourceType: 'module', ecmaVersion: 2018})
  let expectedScriptTotalUses = 4;
  let expectedScriptCommonUses = 1;

  // Profile with definitions created manually for the TestComponent.
  let profile = JSON.parse(fs.readFileSync(fixturePath + '/test_component-profile.json'));
  profile = profileVueScript(profile, vueScriptAst, (fixturePath + '/TestComponentScript.js'), 'test_component');
  console.log(profile)

  let allUses = [];
  Object.keys(profile).forEach(k => {
    allUses = [...allUses, ...profile[k].uses]
  })

  it('profiles all uses as expected', function() {
    expect(allUses.length).toEqual(expectedScriptTotalUses);
    expect(allUses.filter(u => u.common).length).toEqual(expectedScriptCommonUses);
  })
});

describe("profileVueTemplate", function() {
    // Vue <template> Setup
    let vueFile = fs.readFileSync(fixturePath + '/TestComponent.vue');
    let vueTemplate = vueCompiler.compile(vueFile.toString());
    // Remove the `with(this) { return` ... `}` bit to avoid issues with AST generation
    const render = vueTemplate.render.replace(/^.{18}|.{1}$/g, '');
    let vueTemplateAst = espree.parse(render, {
      ecmaVersion: '2018',
      sourceType: 'module',
      ecmaFeatures: { jsx: true, templateStrings: true },
    });
    let allUses = [];
    Object.keys(profile).forEach(k => {
      allUses = [...allUses, ...profile[k].uses]
    })
    const expectedTemplateTotalUses = 9;
    const expectedTemplateCommonUses = 4;
    let profile = JSON.parse(fs.readFileSync(fixturePath + '/test_component-profile.json'));
    profile = profileVueTemplate(profile, vueTemplateAst, fixturePath + '/TestComponent.vue', )
    it('profiles all uses as expected', function() {
      expect(allUses.length).toEqual(expectedTemplateTotalUses);
      expect(allUses.filter(u => u.common).length).toEqual(expectedTemplateCommonUses);
    })
})
