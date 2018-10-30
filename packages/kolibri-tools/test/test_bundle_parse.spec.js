const path = require('path');
const _ = require('lodash');
const parseBundlePlugin = require('../lib/parse_bundle_plugin');

const readBundlePlugins = require('../lib/read_bundle_plugins');

jest.mock('../lib/apiSpecExportTools', () => ({
  coreAliases: () => ({}),
  coreExternals: () => ({}),
}));

jest.mock('../lib/logging', () => ({
  error: () => {},
}));

const baseData = {
  name: 'kolibri.plugin.test.test_plugin',
  src_file: 'src/file.js',
  stats_file: 'output.json',
  static_url_root: 'static',
  static_dir: 'kolibri/plugin/test',
  locale_data_folder: 'kolibri/locale/test',
  version: 'test',
  plugin_path: 'kolibri/plugin',
};

const baseData1 = {
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
  let data;
  beforeEach(function() {
    data = _.clone(baseData);
  });
  describe('input is valid, bundles output', function() {
    it('should have one entry', function() {
      expect(typeof parseBundlePlugin(data, '/')).not.toEqual('undefined');
    });
    it('should set the entry name to data.name', function() {
      expect(Object.keys(parseBundlePlugin(data).entry)[0]).toEqual(data.name);
    });
    it('should set the entry path to the path to the source file', function() {
      expect(parseBundlePlugin(data).entry[data.name]).toEqual(
        path.join(data.plugin_path, data.src_file)
      );
    });
    it('should add plugin node modules to resolve paths', function() {
      expect(parseBundlePlugin(data).resolve.modules).toContain(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should add plugin node modules first to resolve paths', function() {
      expect(parseBundlePlugin(data).resolve.modules[0]).toEqual(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should add plugin node modules to resolve loader paths', function() {
      expect(parseBundlePlugin(data).resolveLoader.modules).toContain(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should add plugin node modules first to resolve loader paths', function() {
      expect(parseBundlePlugin(data).resolveLoader.modules[0]).toEqual(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should set the name to data.name', function() {
      expect(parseBundlePlugin(data).name).toEqual(data.name);
    });
    it('should set the output path to the correct subdir in static', function() {
      expect(parseBundlePlugin(data).output.path).toEqual(
        path.resolve(path.join(data.static_dir, data.name))
      );
    });
    it('should include the version in the output filename', function() {
      expect(parseBundlePlugin(data).output.filename).toContain(data.version);
    });
    it('should include the version in the output chunk filename', function() {
      expect(parseBundlePlugin(data).output.chunkFilename).toContain(data.version);
    });
  });

  function expectParsedDataIsUndefined(data) {
    expect(parseBundlePlugin(data)).toBeUndefined();
  }

  describe('input is missing name, bundles output', function() {
    it('should be undefined', function() {
      delete data.name;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing src_file, bundles output', function() {
    it('should be undefined', function() {
      delete data.src_file;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing stats_file, bundles output', function() {
    it('should be undefined', function() {
      delete data.stats_file;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing static_dir, bundles output', function() {
    it('should be undefined', function() {
      delete data.static_dir;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing locale_data_folder, bundles output', function() {
    it('should be undefined', function() {
      delete data.locale_data_folder;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing plugin_path, bundles output', function() {
    it('should be undefined', function() {
      delete data.plugin_path;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing version, bundles output', function() {
    it('should be undefined', function() {
      delete data.version;
      expectParsedDataIsUndefined(data);
    });
  });
});

describe('readBundlePlugins', function() {
  let data = [];

  describe('two valid inputs, output', function() {
    it('should have two entries', function() {
      data = [baseData, baseData1];
      expect(readBundlePlugins(data)).toHaveLength(2);
    });
  });
  describe('one valid input out of two, output', function() {
    it('should have one entry', function() {
      const badData = _.clone(baseData);
      delete badData.src_file;
      data = [badData, baseData1];
      expect(readBundlePlugins(data)).toHaveLength(1);
    });
  });
  describe('no valid input, output', function() {
    it('should have no entries', function() {
      const badData = _.clone(baseData);
      delete badData.src_file;
      const badData1 = _.clone(baseData1);
      delete badData1.src_file;
      data = [badData, badData1];
      expect(readBundlePlugins(data)).toHaveLength(0);
    });
  });
});
