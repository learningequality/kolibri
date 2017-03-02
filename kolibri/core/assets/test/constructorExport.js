/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

const assert = require('assert');
const rewire = require('rewire');

const constructorExport = rewire('../src/core-app/constructorExport');

const testSpec = {
  module: 'test',
};

const oneDeepSpec = {
  test: testSpec,
};

const twoDeepSpec = {
  test: {
    test: testSpec,
  },
};

describe('coreExternals', function () {
  describe('top level with special keys', function () {
    it('should have no entries', function (done) {
      constructorExport.__set__('apiSpec', testSpec);
      assert(Object.keys(constructorExport()).length === 0);
      done();
    });
  });
  describe('1 nested valid spec', function () {
    it('should have one entry', function (done) {
      constructorExport.__set__('apiSpec', oneDeepSpec);
      assert(Object.keys(constructorExport()).length === 1);
      done();
    });
    it('should have no children', function (done) {
      constructorExport.__set__('apiSpec', oneDeepSpec);
      assert(constructorExport().test === 'test');
      done();
    });
  });
  describe('2 nested valid spec', function () {
    it('should have one entry', function (done) {
      constructorExport.__set__('apiSpec', twoDeepSpec);
      assert(Object.keys(constructorExport()).length === 1);
      done();
    });
    it('should be nested two deep', function (done) {
      constructorExport.__set__('apiSpec', twoDeepSpec);
      assert(constructorExport().test.test === 'test');
      done();
    });
  });
});
