const fs = require('fs');
const path = require('path');
var vueCompiler = require('vue-template-compiler');
const rewire = require('rewire');
const profile$trs = rewire('../lib/profile$trs');

const getStringDefinitions = profile$trs.__get__('getStringDefinitions');

describe("getStringDefinitions", function() {
    let fixturePath = path.resolve(__dirname + '/fixtures/');
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


