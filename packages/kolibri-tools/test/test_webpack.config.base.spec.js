const path = require('path');
const _ = require('lodash');
const webpackConfigBase = require('../lib/webpack.config.base');

jest.mock('../lib/apiSpecExportTools', () => ({
  coreAliases: () => ({}),
  coreExternals: () => ({}),
}));

jest.mock('../lib/logging', () => ({
  error: () => {},
  getLogger: () => {
    return {
      error: () => {},
    };
  },
}));

jest.mock(
  'test',
  () => ({
    webpack_config: {
      entry: 'test',
    },
  }),
  { virtual: true }
);

const baseData = {
  name: 'kolibri.plugin.test.test_plugin',
  bundle_id: 'test_plugin',
  stats_file: 'output.json',
  static_url_root: 'static',
  static_dir: 'kolibri/plugin/test',
  locale_data_folder: 'kolibri/locale/test',
  version: 'test',
  plugin_path: 'kolibri/plugin',
  config_path: 'test',
  index: null,
};

describe('webpackConfigBase', function() {
  let data;
  beforeEach(function() {
    data = _.clone(baseData);
  });
  describe('input is valid, bundles output', function() {
    it('should have one entry', function() {
      expect(Object.keys(webpackConfigBase(data).entry)).toHaveLength(1);
    });
    it('should add plugin node modules to resolve paths', function() {
      expect(webpackConfigBase(data).resolve.modules).toContain(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should add plugin node modules first to resolve paths', function() {
      expect(webpackConfigBase(data).resolve.modules[0]).toEqual(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should add plugin node modules to resolve loader paths', function() {
      expect(webpackConfigBase(data).resolveLoader.modules).toContain(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should add plugin node modules first to resolve loader paths', function() {
      expect(webpackConfigBase(data).resolveLoader.modules[0]).toEqual(
        path.join(data.plugin_path, 'node_modules')
      );
    });
    it('should set the name to data.name', function() {
      expect(webpackConfigBase(data).name).toEqual(data.name);
    });
    it('should set the output path to the correct subdir in static', function() {
      expect(webpackConfigBase(data).output.path).toEqual(
        path.resolve(path.join(data.static_dir, data.name))
      );
    });
    it('should include the version in the output filename', function() {
      expect(webpackConfigBase(data).output.filename).toContain(data.version);
    });
    it('should include the version in the output chunk filename', function() {
      expect(webpackConfigBase(data).output.chunkFilename).toContain(data.version);
    });
  });

  function expectParsedDataIsUndefined(data) {
    expect(webpackConfigBase(data)).toBeUndefined();
  }

  describe('input is missing name, bundles output', function() {
    it('should be undefined', function() {
      delete data.name;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing config_path, bundles output', function() {
    it('should be undefined', function() {
      delete data.config_path;
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
