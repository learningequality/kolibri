import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ROOT_DIR, TIMEOUT, postcssHtmlLoadsSecondPostcss } from './stylelintTestUtils';

jest.setTimeout(TIMEOUT);

const vueSource = '<template>\n\n  <div></div>\n\n</template>\n';

describe('kolibri-format CLI', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kolibri-format-cli-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true });
  });

  function runCliWithPostcssSplit(args) {
    const cli = path.join(ROOT_DIR, 'cli.js');
    return spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `${postcssHtmlLoadsSecondPostcss}
        process.argv = ${JSON.stringify([process.execPath, cli, ...args])};
        await import(${JSON.stringify(cli)});`,
      ],
      { cwd: ROOT_DIR, encoding: 'utf-8' },
    );
  }

  it('reports a postcss split once however many Vue files it lints', () => {
    const files = ['a.vue', 'b.vue', 'c.vue'].map(name => path.join(dir, name));
    files.forEach(file => fs.writeFileSync(file, vueSource));
    const { status, stdout, stderr } = runCliWithPostcssSplit(files);
    expect(status).toBe(1);
    expect(`${stdout}${stderr}`.match(/postcss-html loads/g)).toHaveLength(1);
  });

  it('still lints and fixes non-Vue files under a postcss split', () => {
    const vueFile = path.join(dir, 'a.vue');
    const scssFile = path.join(dir, 'b.scss');
    const jsFile = path.join(dir, 'c.js');
    fs.writeFileSync(vueFile, vueSource);
    fs.writeFileSync(scssFile, 'a{color:red}\n');
    fs.writeFileSync(jsFile, 'export const a=1\n');
    const { status } = runCliWithPostcssSplit(['--write', vueFile, scssFile, jsFile]);
    expect(status).toBe(1);
    expect(fs.readFileSync(scssFile, 'utf-8')).toBe('a {\n  color: red;\n}\n');
    expect(fs.readFileSync(jsFile, 'utf-8')).toBe('export const a = 1;\n');
  });
});
