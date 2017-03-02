var assert = require('assert');
var rewire = require('rewire');
var _ = require('lodash');

var parseBundlePlugin = require('../src/parse_bundle_plugin');
var readBundlePlugins = rewire('../src/read_bundle_plugins');

var baseData = {
  name: "kolibri.plugin.test.test_plugin",
  src_file: "src/file.js",
  stats_file: "output.json",
  static_url_root: "static",
  static_dir: "kolibri/plugin/test",
  locale_data_folder: "kolibri/locale/test",
  version: "test",
  plugin_path: "kolibri/plugin"
};

var baseData1 = {
  name: "kolibri.plugin.test.test_plugin1",
  src_file: "src/file1.js",
  stats_file: "output1.json",
  static_url_root: "static1",
  static_dir: "kolibri/plugin/test1",
  locale_data_folder: "kolibri/locale/test1",
  version: "test",
  plugin_path: "kolibri/plugin1"
};

describe('parseBundlePlugin', function() {
  var data;
  beforeEach(function() {
    data = _.clone(baseData);
  });
  describe('input is valid, bundles output', function() {
    it('should have one entry', function (done) {
      assert(typeof parseBundlePlugin(data, "/")[0] !== "undefined");
      done();
    });
  });
  describe('input is missing name, bundles output', function() {
    it('should be undefined', function (done) {
      delete data.name
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing src_file, bundles output', function() {
    it('should be undefined', function (done) {
      delete data.src_file
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing stats_file, bundles output', function() {
    it('should be undefined', function (done) {
      delete data.stats_file
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing static_dir, bundles output', function() {
    it('should be undefined', function (done) {
      delete data.static_dir
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing locale_data_folder, bundles output', function() {
    it('should be undefined', function (done) {
      delete data.locale_data_folder
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing plugin_path, bundles output', function() {
    it('should be undefined', function (done) {
      delete data.plugin_path;
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing version, bundles output', function() {
    it('should be undefined', function (done) {
      delete data.version
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is valid, has externals flag and core_name value, externals output', function() {
    it('should have one entry', function (done) {
      data.external = true;
      data.core_name = "test_core";
      assert(typeof parseBundlePlugin(data, "/")[1] !== "undefined");
      done();
    });
  });
  describe('input is valid, has core flag', function() {
    it('should have its name set to kolibriGlobal', function (done) {
      data.external = true;
      data.core_name = "kolibriGlobal";
      assert.equal(parseBundlePlugin(data, "/")[0].output.library, data.core_name);
      done();
    });
  });
});

describe('readBundlePlugins', function() {
  var data = [];

  beforeEach(function() {
    readBundlePlugins.__set__("readWebpackJson", function() {
      return data;
    });
  });

  describe('two valid inputs, output', function() {
    it('should have two entries', function (done) {
      data = [
        baseData,
        baseData1
      ];
      assert(readBundlePlugins("", "").length === 2);
      done();
    });
  });
  describe('one valid input out of two, output', function() {
    it('should have one entry', function (done) {
      var badData = _.clone(baseData);
      delete badData.src_file;
      data = [
        badData,
        baseData1
      ];
      assert(readBundlePlugins("", "").length === 1);
      done();
    });
  });
  describe('no valid input, output', function() {
    it('should have no entries', function (done) {
      var badData = _.clone(baseData);
      delete badData.src_file;
      var badData1 = _.clone(baseData1);
      delete badData1.src_file;
      data = [
        badData,
        badData1
      ];
      assert(readBundlePlugins("", "").length === 0);
      done();
    });
  });
  describe('two external flags on inputs, one with core_name value, externals output', function() {
    it('should have two entries', function (done) {
      var coreData = _.clone(baseData);
      coreData.external = true;
      coreData.core_name = "test_global";
      var coreData1 = _.clone(baseData1);
      coreData1.external = true;
      data = [
        coreData,
        coreData1
      ];
      assert(Object.keys(readBundlePlugins("", function(){return {};})[0].externals).length === 2);
      done();
    });
  });
  describe('two core bundles specified', function() {
    it('should throw an error', function (done) {
      var coreData = _.clone(baseData);
      coreData.external = true;
      coreData.core_name = "test_global";
      var coreData1 = _.clone(baseData1);
      coreData1.name = coreData.name;
      coreData1.external = true;
      coreData1.core_name = "test_global";
      data = [
        coreData,
        coreData1
      ];
      assert.throws(function() {readBundlePlugins("", function(){return {};});});
      done();
    });
  });
});
