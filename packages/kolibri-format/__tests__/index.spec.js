import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ROOT_DIR,
  TIMEOUT,
  postcssHtmlLoadsSecondPostcss,
  runInChildProcess,
} from './stylelintTestUtils';

jest.setTimeout(TIMEOUT);

const index = pathToFileURL(path.join(ROOT_DIR, 'index.js')).href;

function lintSource(file, source, { hostProjectDir = ROOT_DIR, prelude = '' } = {}) {
  return runInChildProcess(
    `
      ${prelude}
      const { lintSource } = await import(${JSON.stringify(index)});
      const result = await lintSource(${JSON.stringify({ file, source })});
      console.log(JSON.stringify(result));
    `,
    { cwd: hostProjectDir },
  );
}

const shortHexSource = '.a {\n  color: #fff;\n}\n';
const longHexSource = '.a {\n  color: #ffffff;\n}\n';
const inlineStyleSource = '<template>\n\n  <div style="top: 0;"></div>\n\n</template>\n';

describe('lintSource', () => {
  it.each([
    ['its own package', ROOT_DIR],
    ['a host project that does not install its config', path.dirname(ROOT_DIR)],
  ])('returns the code stylelint fixed, run from %s', (_, hostProjectDir) => {
    const { formatted } = lintSource('test.scss', shortHexSource, { hostProjectDir });
    expect(formatted).toBe(longHexSource);
  });

  it('accepts declarations in an inline style attribute', () => {
    const { formatted, messages, errored } = lintSource('test.vue', inlineStyleSource);
    expect({ formatted, messages, errored }).toEqual({
      formatted: inlineStyleSource,
      messages: [],
      errored: false,
    });
  });

  it('refuses to lint a Vue file when postcss-html loads a different postcss from stylelint', () => {
    expect(() =>
      lintSource('test.vue', inlineStyleSource, { prelude: postcssHtmlLoadsSecondPostcss }),
    ).toThrow(/dedupe postcss in your lockfile/);
  });

  it('lints an SCSS file when postcss-html loads a different postcss from stylelint', () => {
    const { formatted } = lintSource('test.scss', shortHexSource, {
      prelude: postcssHtmlLoadsSecondPostcss,
    });
    expect(formatted).toBe(longHexSource);
  });

  it('reports a warning stylelint cannot fix, without pointing to a --fix option', () => {
    const { messages, errored } = lintSource(
      'test.scss',
      '.a {\n  color: var(--tokens-surfase);\n}\n',
    );
    expect(messages).toEqual([
      expect.stringContaining('Unexpected unknown theme custom property "--tokens-surfase"'),
    ]);
    expect(messages).toEqual([expect.not.stringContaining('--fix')]);
    expect(errored).toBe(true);
  });

  describe('with a host config that sets file globs', () => {
    let hostProjectDir;

    beforeAll(() => {
      hostProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kolibri-format-host-'));
      const config = `const config = require(${JSON.stringify(path.join(ROOT_DIR, '.stylelintrc.js'))});
        module.exports = {
          ...config,
          ignoreFiles: ['ignored/**'],
          overrides: [
            ...config.overrides,
            {
              files: ['legacy/**', '*.legacy.scss', '**/old/*.scss'],
              rules: { 'color-hex-length': null },
            },
          ],
        };`;
      fs.writeFileSync(path.join(hostProjectDir, '.stylelintrc.js'), config);
    });

    afterAll(() => {
      fs.rmSync(hostProjectDir, { recursive: true });
    });

    it.each([
      ['a file its ignoreFiles matches', 'ignored/a.scss'],
      ['a file its override turns the rule off for', 'legacy/a.scss'],
      ['a nested file its slash-free override glob matches by basename', 'sub/a.legacy.scss'],
      ['a nested file its globstar override glob matches by directory', 'sub/old/a.scss'],
    ])('leaves %s unfixed', (_, file) => {
      const { formatted } = lintSource(file, shortHexSource, { hostProjectDir });
      expect(formatted).toBe(shortHexSource);
    });
  });

  it('lints a Less source that uses a Less variable', () => {
    const source = '@w: 10px;\n\n.a {\n  width: @w * 2;\n  color: #fff;\n}\n';
    const { formatted } = lintSource('test.less', source);
    expect(formatted).toBe('@w: 10px;\n\n.a {\n  width: @w * 2;\n  color: #ffffff;\n}\n');
  });

  it('lints a Less source outside the host project with the Less syntax', () => {
    const { messages, errored } = lintSource(
      path.join(os.tmpdir(), 'test.less'),
      '@w: 10px;\n\n.a {\n  width: @w;\n}\n',
    );
    expect({ messages, errored }).toEqual({ messages: [], errored: false });
  });
});

describe('writeSourceToFile', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kolibri-format-write-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true });
  });

  it('formats the other files it writes when one fails to lint, and fails the run', () => {
    const vueFile = path.join(dir, 'a.vue');
    const scssFile = path.join(dir, 'a.scss');
    const { contents, exitCode } = runInChildProcess(`
      ${postcssHtmlLoadsSecondPostcss}
      const { writeSourceToFile } = await import(${JSON.stringify(index)});
      await Promise.all([
        writeSourceToFile(${JSON.stringify(vueFile)}, ${JSON.stringify(inlineStyleSource)}),
        writeSourceToFile(${JSON.stringify(scssFile)}, ${JSON.stringify(shortHexSource)}),
      ]);
      const contents = fs.readFileSync(${JSON.stringify(scssFile)}, 'utf-8');
      console.log(JSON.stringify({ contents, exitCode: process.exitCode }));
      process.exitCode = 0;
    `);
    expect({ contents, exitCode }).toEqual({ contents: longHexSource, exitCode: 1 });
  });
});
