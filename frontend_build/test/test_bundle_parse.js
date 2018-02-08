/* eslint-env node, mocha */

var assert = require('assert');
var rewire = require('rewire');
var _ = require('lodash');
var path = require('path');

var parseBundlePlugin = require('../src/parse_bundle_plugin');
var readBundlePlugins = rewire('../src/read_bundle_plugins');

var baseData = {
  name: 'kolibri.plugin.test.test_plugin',
  src_file: 'src/file.js',
  stats_file: 'output.json',
  static_url_root: 'static',
  static_dir: 'kolibri/plugin/test',
  locale_data_folder: 'kolibri/locale/test',
  version: 'test',
  plugin_path: 'kolibri/plugin',
};

var baseData1 = {
  name: 'kolibri.plugin.test.test_plugin1',
  src_file: 'src/file1.js',
  stats_file: 'output1.json',
  static_url_root: 'static1',
  static_dir: 'kolibri/plugin/test1',
  locale_data_folder: 'kolibri/locale/test1',
  version: 'test',
  plugin_path: 'kolibri/plugin1',
};

describe('parseBundlePlugin', function() {
  var data;
  beforeEach(function() {
    data = _.clone(baseData);
  });
  describe('input is valid, bundles output', function() {
    it('should have one entry', function(done) {
      assert(typeof parseBundlePlugin(data, '/') !== 'undefined');
      done();
    });
    it('should set the entry name to data.name', function(done) {
      assert(Object.keys(parseBundlePlugin(data).entry)[0] === data.name);
      done();
    });
    it('should set the entry path to the path to the source file', function(done) {
      assert(
        parseBundlePlugin(data).entry[data.name] === path.join(data.plugin_path, data.src_file)
      );
      done();
    });
    it('should add plugin node modules to resolve paths', function(done) {
      assert(
        parseBundlePlugin(data).resolve.modules.includes(
          path.join(data.plugin_path, 'node_modules')
        )
      );
      done();
    });
    it('should add plugin node modules first to resolve paths', function(done) {
      assert(
        parseBundlePlugin(data).resolve.modules[0] === path.join(data.plugin_path, 'node_modules')
      );
      done();
    });
    it('should add plugin node modules to resolve loader paths', function(done) {
      assert(
        parseBundlePlugin(data).resolveLoader.modules.includes(
          path.join(data.plugin_path, 'node_modules')
        )
      );
      done();
    });
    it('should add plugin node modules first to resolve loader paths', function(done) {
      assert(
        parseBundlePlugin(data).resolveLoader.modules[0] ===
          path.join(data.plugin_path, 'node_modules')
      );
      done();
    });
    it('should set the name to data.name', function(done) {
      assert(parseBundlePlugin(data).name === data.name);
      done();
    });
    it('should set the output path to the correct subdir in static', function(done) {
      assert(
        parseBundlePlugin(data).output.path === path.resolve(path.join(data.static_dir, data.name))
      );
      done();
    });
    it('should include the version in the output filename', function(done) {
      assert(parseBundlePlugin(data).output.filename.indexOf(data.version) > -1);
      done();
    });
    it('should include the version in the output chunk filename', function(done) {
      assert(parseBundlePlugin(data).output.chunkFilename.indexOf(data.version) > -1);
      done();
    });
    it('should set the public path to the static url', function(done) {
      assert(
        parseBundlePlugin(data).output.publicPath ===
          path.join('/', data.static_url_root, data.name, '/')
      );
      done();
    });
  });
  describe('input is missing name, bundles output', function() {
    it('should be undefined', function(done) {
      delete data.name;
      assert(typeof parseBundlePlugin(data) === 'undefined');
      done();
    });
  });
  describe('input is missing src_file, bundles output', function() {
    it('should be undefined', function(done) {
      delete data.src_file;
      assert(typeof parseBundlePlugin(data) === 'undefined');
      done();
    });
  });
  describe('input is missing stats_file, bundles output', function() {
    it('should be undefined', function(done) {
      delete data.stats_file;
      assert(typeof parseBundlePlugin(data) === 'undefined');
      done();
    });
  });
  describe('input is missing static_dir, bundles output', function() {
    it('should be undefined', function(done) {
      delete data.static_dir;
      assert(typeof parseBundlePlugin(data) === 'undefined');
      done();
    });
  });
  describe('input is missing locale_data_folder, bundles output', function() {
    it('should be undefined', function(done) {
      delete data.locale_data_folder;
      assert(typeof parseBundlePlugin(data) === 'undefined');
      done();
    });
  });
  describe('input is missing plugin_path, bundles output', function() {
    it('should be undefined', function(done) {
      delete data.plugin_path;
      assert(typeof parseBundlePlugin(data) === 'undefined');
      done();
    });
  });
  describe('input is missing version, bundles output', function() {
    it('should be undefined', function(done) {
      delete data.version;
      assert(typeof parseBundlePlugin(data) === 'undefined');
      done();
    });
  });
});

describe('readBundlePlugins', function() {
  var data = [];

  beforeEach(function() {
    readBundlePlugins.__set__('readWebpackJson', function() {
      return data;
    });
  });

  describe('two valid inputs, output', function() {
    it('should have two entries', function(done) {
      data = [baseData, baseData1];
      assert(readBundlePlugins().length === 2);
      done();
    });
  });
  describe('one valid input out of two, output', function() {
    it('should have one entry', function(done) {
      var badData = _.clone(baseData);
      delete badData.src_file;
      data = [badData, baseData1];
      assert(readBundlePlugins().length === 1);
      done();
    });
  });
  describe('no valid input, output', function() {
    it('should have no entries', function(done) {
      var badData = _.clone(baseData);
      delete badData.src_file;
      var badData1 = _.clone(baseData1);
      delete badData1.src_file;
      data = [badData, badData1];
      assert(readBundlePlugins().length === 0);
      done();
    });
  });
});
