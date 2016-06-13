var assert = require('assert');
var fs = require('fs');
var path = require('path');
var temp = require('temp');
var child_process = require('child_process');
var rewire = require('rewire');
var sinon = require('sinon');

var parseBundlePlugin = require('../src/parse_bundle_plugin');
var readBundlePlugins = rewire('../src/read_bundle_plugins');

describe('parseBundlePlugin', function() {
  describe('input is valid, bundles output', function() {
    it('should have one entry', function (done) {
      var data = {
        name: "kolibri.plugin.test.test_plugin",
        src_file: "src/file.js",
        stats_file: "output.json",
        static_url_root: "static",
        static_dir: "kolibri/plugin/test"
      };
      assert(typeof parseBundlePlugin(data, "/")[0] !== "undefined");
      done();
    });
  });
  describe('input is missing name, bundles output', function() {
    it('should be undefined', function (done) {
      var data = {
        src_file: "src/file.js",
        stats_file: "output.json",
        static_url_root: "static",
        static_dir: "kolibri/plugin/test"
      };
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing src_file, bundles output', function() {
    it('should be undefined', function (done) {
      var data = {
        name: "kolibri.plugin.test.test_plugin",
        stats_file: "output.json",
        static_url_root: "static",
        static_dir: "kolibri/plugin/test"
      };
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing stats_file, bundles output', function() {
    it('should be undefined', function (done) {
      var data = {
        name: "kolibri.plugin.test.test_plugin",
        src_file: "src/file.js",
        static_url_root: "static",
        static_dir: "kolibri/plugin/test"
      };
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is missing static_dir, bundles output', function() {
    it('should be undefined', function (done) {
      var data = {
        name: "kolibri.plugin.test.test_plugin",
        src_file: "src/file.js",
        static_url_root: "static",
        stats_file: "output.json"
      };
      assert(typeof parseBundlePlugin(data, "/") === "undefined");
      done();
    });
  });
  describe('input is valid, has externals flag and core_name value, externals output', function() {
    it('should have one entry', function (done) {
      var data = {
        name: "kolibri.plugin.test.test_plugin",
        src_file: "src/file.js",
        external: true,
        stats_file: "output.json",
        static_dir: "kolibri/plugin/test",
        static_url_root: "static",
        core_name: "test_core"
      };
      assert(typeof parseBundlePlugin(data, "/")[1] !== "undefined");
      done();
    });
  });
  describe('input is valid, has core flag', function() {
    it('should have its name set to kolibriGlobal', function (done) {
      var data = {
        name: "kolibri.plugin.test.test_plugin",
        src_file: "src/file.js",
        external: true,
        core_name: "kolibriGlobal",
        stats_file: "output.json",
        static_url_root: "static",
        static_dir: "kolibri/plugin/test"
      };
      assert.equal(parseBundlePlugin(data, "/")[0].output.library, "kolibriGlobal");
      done();
    });
  });
});

describe('readBundlePlugins', function() {
  var data = [];

  beforeEach(function() {
    readBundlePlugins.__set__("execSync", function() {
      var output = JSON.stringify(data);
      return new Buffer(output);
    });
  });

  describe('two valid inputs, output', function() {
    it('should have two entries', function (done) {
      data = [
        {
          name: "kolibri.plugin.test.test_plugin",
          src_file: "src/file.js",
          stats_file: "output.json",
          static_url_root: "static",
          static_dir: "kolibri/plugin/test"
        },
        {
          name: "kolibri.plugin.test.test_plugin1",
          src_file: "src/file1.js",
          stats_file: "output1.json",
          static_url_root: "static",
          static_dir: "kolibri/plugin/test"
        }
      ];
      assert(readBundlePlugins("", "").length === 2);
      done();
    });
  });
  describe('one valid input out of two, output', function() {
    it('should have one entry', function (done) {
      data = [
        {
          name: "kolibri.plugin.test.test_plugin",
          stats_file: "output.json",
          static_url_root: "static",
          static_dir: "kolibri/plugin/test"
        },
        {
          name: "kolibri.plugin.test.test_plugin1",
          src_file: "src/file1.js",
          stats_file: "output1.json",
          static_url_root: "static",
          static_dir: "kolibri/plugin/test"
        }
      ];
      assert(readBundlePlugins("", "").length === 1);
      done();
    });
  });
  describe('no valid input, output', function() {
    it('should have no entries', function (done) {
      data = [
        {
          name: "kolibri.plugin.test.test_plugin",
          stats_file: "output.json",
          static_url_root: "static",
          static_dir: "kolibri/plugin/test"
        },
        {
          name: "kolibri.plugin.test.test_plugin1",
          stats_file: "output1.json",
          static_url_root: "static",
          static_dir: "kolibri/plugin/test"
        }
      ];
      assert(readBundlePlugins("", "").length === 0);
      done();
    });
  });
  describe('two external flags on inputs, one with core_name value, externals output', function() {
    it('should have one entry', function (done) {
      data = [
        {
          name: "kolibri.plugin.test.test_plugin",
          src_file: "src/file.js",
          stats_file: "output.json",
          external: true,
          static_dir: "kolibri/plugin/test",
          static_url_root: "static",
          core_name: "test_global"
        },
        {
          name: "kolibri.plugin.test.test_plugin1",
          src_file: "src/file1.js",
          stats_file: "output1.json",
          external: true,
          static_url_root: "static",
          static_dir: "kolibri/plugin/test"
        }
      ];
      assert(Object.keys(readBundlePlugins("", function(){return {};})[0].externals).length === 1);
      done();
    });
  });
  describe('two identically named external flags on inputs, externals output', function() {
    it('should have one entry', function (done) {
      data = [
        {
          name: "kolibri.plugin.test.test_plugin",
          src_file: "src/file.js",
          stats_file: "output.json",
          external: true,
          static_dir: "kolibri/plugin/test",
          static_url_root: "static",
          core_name: "test_global"
        },
        {
          name: "kolibri.plugin.test.test_plugin",
          src_file: "src/file1.js",
          stats_file: "output1.json",
          external: true,
          static_dir: "kolibri/plugin/test",
          static_url_root: "static",
          core_name: "test_global"
        }
      ];
      assert(Object.keys(readBundlePlugins("", function(){return {};})[0].externals).length === 1);
      done();
    });
  });
});
