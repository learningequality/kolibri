import { execFileSync } from 'node:child_process';
import path from 'node:path';
import compat from 'core-js-compat';
import { browsers } from 'browserslist-config-kolibri/cutoff';

describe('Sandbox polyfill bundle', () => {
  it('shares compatibility data with Babel', () => {
    const script = `
      import { createRequire } from 'node:module';

      const require = createRequire(import.meta.url);
      const installedVersion = require('core-js-compat/package.json').version;
      const babelVersions = ['@babel/preset-env', 'babel-plugin-polyfill-corejs3'].map(name => {
        const requireFromBabel = createRequire(require.resolve(name));
        return requireFromBabel('core-js-compat/package.json').version;
      });
      console.log(JSON.stringify({ installedVersion, babelVersions }));
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
    });
    const { installedVersion, babelVersions } = JSON.parse(output);
    expect(babelVersions).toEqual([installedVersion, installedVersion]);
  });

  it('injects only polyfills that the cutoff cohort supports', () => {
    const script = `
      import { transformSync } from '@babel/core';
      const code = 'function probe(xs, values, key) { xs.toReversed(); Object.groupBy(values, key); }';
      console.log(transformSync(code).code);
    `;
    const code = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
    });
    const emitted = Array.from(code.matchAll(/core-js\/modules\/([^'"]+)\.js/g), match => match[1]);

    expect(emitted).toContain('es.array.to-reversed');
    expect(compat({ targets: browsers, modules: emitted }).list).toEqual([]);
  });
});
