import { execFileSync } from 'node:child_process';
import path from 'node:path';
import compat from 'core-js-compat';
import supportedBrowsers from 'browserslist-config-kolibri';
import { browsers } from 'browserslist-config-kolibri/cutoff';

describe('core polyfill bundle', () => {
  beforeEach(() => {
    jest.replaceProperty(process, 'env', { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: '1' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('includes exactly the polyfills the cutoff cohort supports and older targets need', () => {
    const script = `
      import { transformFileSync } from '@babel/core';
      import buildConfig from './buildConfig.js';

      const { webpack_config: config } = buildConfig.find(bundle => bundle.bundle_id === 'polyfills');
      const { options } = config.module.rules.find(rule => rule.loader === 'babel-loader');
      console.log(transformFileSync(config.entry, options).code);
    `;
    const code = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf-8',
    });
    const emitted = Array.from(code.matchAll(/core-js\/modules\/([^'"]+)\.js/g), match => match[1]);

    const version = '3.49';
    const needed = compat({ targets: supportedBrowsers, version, modules: 'core-js' }).list;
    const missingAtCutoff = new Set(compat({ targets: browsers, version }).list);
    expect(emitted.sort()).toEqual(needed.filter(module => !missingAtCutoff.has(module)).sort());
  });
});
