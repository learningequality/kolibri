const path = require('node:path');
const _ = require('lodash');
const baseConfig = require('../webpack.config.base');
const webpackConfigPlugin = require('../webpack.config.plugin');

jest.mock('../apiSpecExportTools', () => ({
  getCoreExternals: () => ({}),
}));

// Spied on to simulate a base config with no JS transpilation rule.
jest.mock('../webpack.config.base', () => {
  const actual = jest.requireActual('../webpack.config.base');
  return jest.fn((...args) => actual(...args));
});

jest.mock('kolibri-logging', () => ({
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
  { virtual: true },
);

jest.mock(
  'test_skip_message_registration',
  () => ({
    webpack_config: {
      entry: 'test',
    },
    skipMessageRegistration: true,
  }),
  { virtual: true },
);

function hasMessageRegistrationPlugin(config) {
  return config.plugins.some(plugin => plugin.constructor.name === 'MessageRegistrationPlugin');
}

function hasRTLPlugin(config) {
  return config.plugins.some(plugin => plugin.constructor.name === 'WebpackRTLPlugin');
}

function findJsRule(config) {
  return config.module.rules.find(rule => rule.loader && rule.loader.includes('swc-loader'));
}

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

describe('webpackConfigPlugin', function () {
  let data;
  beforeEach(function () {
    data = _.clone(baseData);
  });
  describe('input is valid, bundles output', function () {
    it('should have one entry', function () {
      expect(Object.keys(webpackConfigPlugin(data).entry)).toHaveLength(1);
    });
    it('should add plugin node modules to resolve paths', function () {
      expect(webpackConfigPlugin(data).resolve.modules).toContain(
        path.join(data.plugin_path, 'node_modules'),
      );
    });
    it('should add plugin node modules first to resolve paths', function () {
      expect(webpackConfigPlugin(data).resolve.modules[0]).toEqual(
        path.join(data.plugin_path, 'node_modules'),
      );
    });
    it('should add plugin node modules to resolve loader paths', function () {
      expect(webpackConfigPlugin(data).resolveLoader.modules).toContain(
        path.join(data.plugin_path, 'node_modules'),
      );
    });
    it('should add plugin node modules first to resolve loader paths', function () {
      expect(webpackConfigPlugin(data).resolveLoader.modules[0]).toEqual(
        path.join(data.plugin_path, 'node_modules'),
      );
    });
    it('should set the name to data.name', function () {
      expect(webpackConfigPlugin(data).name).toEqual(data.name);
    });
    it('should set the output path to the correct subdir in static', function () {
      expect(webpackConfigPlugin(data).output.path).toEqual(
        path.resolve(path.join(data.static_dir, data.name)),
      );
    });
    it('should include the version in the output filename', function () {
      expect(webpackConfigPlugin(data).output.filename).toContain(data.version);
    });
    it('should include the version in the output chunk filename', function () {
      expect(webpackConfigPlugin(data).output.chunkFilename).toContain(data.version);
    });
  });

  function expectParsedDataIsUndefined(data) {
    expect(webpackConfigPlugin(data)).toBeUndefined();
  }

  describe('input is missing name, bundles output', function () {
    it('should be undefined', function () {
      delete data.name;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing config_path, bundles output', function () {
    it('should be undefined', function () {
      delete data.config_path;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing stats_file, bundles output', function () {
    it('should be undefined', function () {
      delete data.stats_file;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing static_dir, bundles output', function () {
    it('should be undefined', function () {
      delete data.static_dir;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing locale_data_folder, bundles output', function () {
    it('should be undefined', function () {
      delete data.locale_data_folder;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing plugin_path, bundles output', function () {
    it('should be undefined', function () {
      delete data.plugin_path;
      expectParsedDataIsUndefined(data);
    });
  });
  describe('input is missing version, bundles output', function () {
    it('should be undefined', function () {
      delete data.version;
      expectParsedDataIsUndefined(data);
    });
  });

  describe('message registration', function () {
    it('should include MessageRegistrationPlugin by default', function () {
      expect(hasMessageRegistrationPlugin(webpackConfigPlugin(data))).toBe(true);
    });
    it('should exclude MessageRegistrationPlugin when the bundle config sets skipMessageRegistration', function () {
      data.config_path = 'test_skip_message_registration';
      expect(hasMessageRegistrationPlugin(webpackConfigPlugin(data))).toBe(false);
    });
  });

  describe('sandbox handler bundles', function () {
    beforeEach(function () {
      data.sandbox_handler = true;
      // Resolving core-js for the polyfill version needs a real plugin with it as a dependency.
      data.plugin_path = 'kolibri/plugins/html5_viewer';
      delete data.locale_data_folder;
    });

    it('should not need a locale_data_folder', function () {
      expect(webpackConfigPlugin(data)).toBeDefined();
    });

    it('should exclude MessageRegistrationPlugin', function () {
      expect(hasMessageRegistrationPlugin(webpackConfigPlugin(data))).toBe(false);
    });

    it('should exclude WebpackRTLPlugin', function () {
      expect(hasRTLPlugin(webpackConfigPlugin(data))).toBe(false);
    });

    it('should inject the polyfills they use, as they have no core bundle to rely on', function () {
      const { env } = findJsRule(webpackConfigPlugin(data, { transpile: true })).options;
      expect(env.mode).toEqual('usage');
      expect(env.coreJs).toEqual(
        require(require.resolve('core-js/package.json', { paths: [data.plugin_path] })).version,
      );
    });

    it('should detect module type per file so CommonJS gets require() polyfill imports', function () {
      expect(findJsRule(webpackConfigPlugin(data, { transpile: true })).options.isModule).toEqual(
        'unknown',
      );
    });

    it('should throw when there is no transpilation rule to inject polyfills through', function () {
      baseConfig.mockReturnValueOnce({ module: { rules: [] } });
      expect(() => webpackConfigPlugin(data, { transpile: true })).toThrow(
        /no JS transpilation rule/,
      );
    });
  });

  describe('plugin bundles', function () {
    it('should include WebpackRTLPlugin', function () {
      expect(hasRTLPlugin(webpackConfigPlugin(data))).toBe(true);
    });

    it('should not inject polyfills, as they rely on the core bundle for them', function () {
      const { options } = findJsRule(webpackConfigPlugin(data, { transpile: true }));
      expect(options.env.mode).toBeUndefined();
      expect(options.isModule).toBeUndefined();
    });
  });
});
