var assert = require('assert');
var rewire = require('rewire');

var apiSpecExportTools = rewire('../src/apiSpecExportTools');

var testSpec = {
  module: 'test'
};

var oneDeepSpec = {
  test: testSpec
};

var twoDeepSpec = {
  test: oneDeepSpec
};

var localSpec = {
  module: './test'
};

var oneDeepLocal = {
  test: localSpec
};

var twoDeepLocal = {
  test: oneDeepLocal
};

describe('coreExternals', function() {

  // Note: all externals objects will have at least one entry for the Kolibri object itself.
  describe('top level with special keys', function() {
    it('should have one entry', function (done) {
      apiSpecExportTools.__set__("apiSpec", testSpec);
      assert(Object.keys(apiSpecExportTools.coreExternals('test_global')).length === 1);
      done();
    });
  });
  describe('1 nested valid spec for non-local module', function() {
    it('should have three entries', function (done) {
      apiSpecExportTools.__set__("apiSpec", oneDeepSpec);
      assert(Object.keys(apiSpecExportTools.coreExternals('test_global')).length === 3);
      done();
    });
  });
  describe('2 nested valid spec for non-local module', function() {
    it('should have three entries', function (done) {
      apiSpecExportTools.__set__("apiSpec", twoDeepSpec);
      assert(Object.keys(apiSpecExportTools.coreExternals('test_global')).length === 3);
      done();
    });
  });
  describe('1 nested valid spec for local module', function() {
    it('should have two entries', function (done) {
      apiSpecExportTools.__set__("apiSpec", oneDeepLocal);
      assert(Object.keys(apiSpecExportTools.coreExternals('test_global')).length === 2);
      done();
    });
  });
  describe('2 nested valid spec for local module', function() {
    it('should have two entries', function (done) {
      apiSpecExportTools.__set__("apiSpec", twoDeepLocal);
      assert(Object.keys(apiSpecExportTools.coreExternals('test_global')).length === 2);
      done();
    });
  });
});

describe('coreAliases', function() {

  describe('top level with special keys no local import', function() {
    it('should have no entries', function (done) {
      apiSpecExportTools.__set__("apiSpec", testSpec);
      assert(Object.keys(apiSpecExportTools.coreAliases()).length === 0);
      done();
    });
  });
  describe('1 nested valid spec no local import', function() {
    it('should have no entries', function (done) {
      apiSpecExportTools.__set__("apiSpec", oneDeepSpec);
      assert(Object.keys(apiSpecExportTools.coreAliases()).length === 0);
      done();
    });
  });
  describe('2 nested valid spec no local import', function() {
    it('should have no entries', function (done) {
      apiSpecExportTools.__set__("apiSpec", twoDeepSpec);
      assert(Object.keys(apiSpecExportTools.coreAliases()).length === 0);
      done();
    });
  });
  describe('1 nested valid spec with local import', function() {
    it('should have one entry', function (done) {
      apiSpecExportTools.__set__("apiSpec", oneDeepLocal);
      assert(Object.keys(apiSpecExportTools.coreAliases()).length === 1);
      done();
    });
    it('should have a path of kolibri/test', function (done) {
      apiSpecExportTools.__set__("apiSpec", oneDeepLocal);
      assert(Object.keys(apiSpecExportTools.coreAliases())[0] === "kolibri/test");
      done();
    });
  });
  describe('2 nested valid spec with local import', function() {
    it('should have one entry', function (done) {
      apiSpecExportTools.__set__("apiSpec", twoDeepLocal);
      assert(Object.keys(apiSpecExportTools.coreAliases()).length === 1);
      done();
    });
    it('should have a path of kolibri/test/test', function (done) {
      apiSpecExportTools.__set__("apiSpec", twoDeepLocal);
      assert(Object.keys(apiSpecExportTools.coreAliases())[0] === "kolibri/test/test");
      done();
    });
  });
});
