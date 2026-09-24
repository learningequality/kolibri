const { spawnSync } = require('node:child_process');
const path = require('node:path');
const _ = require('lodash');
const webpackConfigPlugin = require('../webpack.config.plugin');

jest.mock('../apiSpecExportTools', () => ({
  getCoreExternals: () => ({ vue: 'kolibriCoreAppGlobal.lib.vue' }),
}));

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

  describe('dev server public path', function () {
    it('should advertise localhost and port 3000 by default', function () {
      expect(webpackConfigPlugin(data, { devServer: true }).output.publicPath).toEqual(
        `http://localhost:3000/${data.name}/`,
      );
    });
    it('should advertise the public host and port when they are given', function () {
      expect(
        webpackConfigPlugin(data, {
          devServer: true,
          publicHost: 'kolibri.example',
          publicPort: 34567,
        }).output.publicPath,
      ).toEqual(`http://kolibri.example:34567/${data.name}/`);
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
    });

    it('should exclude MessageRegistrationPlugin', function () {
      expect(hasMessageRegistrationPlugin(webpackConfigPlugin(data))).toBe(false);
    });

    it('should declare no externals, so nothing resolves against the main window', function () {
      expect(webpackConfigPlugin(data).externals).toEqual({});
    });

    it('should exclude WebpackRTLPlugin', function () {
      expect(hasRTLPlugin(webpackConfigPlugin(data))).toBe(false);
    });

    it('should inject the polyfills they use, as they have no core bundle to rely on', function () {
      const { env, jsc } = findJsRule(webpackConfigPlugin(data, { transpile: true })).options;
      expect(env.targets).toEqual(require('browserslist-config-kolibri'));
      expect(jsc).toBeDefined();
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

    it('should name the bundle and plugin when the plugin does not depend on core-js', function () {
      // Jest's resolver finds core-js through its configured module paths whatever
      // `paths` says, and Node also searches the NODE_PATH pnpm sets, so only a plain
      // Node process without it sees the resolution fail.
      const script = `
        require(${JSON.stringify(require.resolve('../webpack.config.plugin'))})(
          {
            ...${JSON.stringify(data)},
            config_path: ${JSON.stringify(path.resolve('kolibri/plugins/html5_viewer/buildConfig.js'))},
            index: 1,
            plugin_path: '/nonexistent/plugin',
          },
          { transpile: true },
        );
      `;
      const { stderr } = spawnSync(process.execPath, ['-e', script], {
        encoding: 'utf-8',
        env: { ...process.env, NODE_PATH: '' },
      });
      expect(stderr).toContain(
        `${data.name} sandbox handler bundle requires core-js as a dependency of /nonexistent/plugin`,
      );
    });
  });

  describe('plugin bundles', function () {
    it('should declare the core externals', function () {
      expect(webpackConfigPlugin(data).externals).toEqual({ vue: 'kolibriCoreAppGlobal.lib.vue' });
    });

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
