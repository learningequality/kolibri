/*
 * stylelint 17 is ESM only, and Jest 30 loads ESM through `require` only on Node 24.9 or
 * later, so specs lint in a child process.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import v8 from 'node:v8';

export const ROOT_DIR = path.resolve(__dirname, '..');

// spawning node and loading a linter config can outrun Jest's 5s default
export const TIMEOUT = 30000;

export const postcssHtmlLoadsSecondPostcss = `
  import fs from 'node:fs';
  import Module from 'node:module';
  import os from 'node:os';
  import path from 'node:path';
  const postcssHtml = fs.realpathSync(
    Module.createRequire(${JSON.stringify(path.join(ROOT_DIR, 'index.js'))}).resolve('postcss-html'),
  );
  const postcssHtmlDir = path.dirname(postcssHtml);
  const postcssRequire = Module.createRequire(Module.createRequire(postcssHtml).resolve('postcss'));
  const postcssDir = path.dirname(postcssRequire.resolve('postcss/package.json'));
  const secondPostcssDir = fs.mkdtempSync(path.join(os.tmpdir(), 'second-postcss-'));
  process.on('exit', () => fs.rmSync(secondPostcssDir, { recursive: true, force: true }));
  fs.cpSync(postcssDir, secondPostcssDir, { recursive: true });
  const resolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, ...rest) {
    if (request === 'postcss' && parent?.filename?.startsWith(postcssHtmlDir)) {
      return path.join(secondPostcssDir, 'lib', 'postcss.js');
    }
    if (!request.startsWith('.') && parent?.filename?.startsWith(secondPostcssDir)) {
      return postcssRequire.resolve(request);
    }
    return resolveFilename.call(this, request, parent, ...rest);
  };
`;

export function runInChildProcess(script, { input, cwd = ROOT_DIR } = {}) {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd,
    encoding: 'utf-8',
    input,
    stdio: 'pipe',
  });
  return JSON.parse(output.trim().split('\n').pop());
}

export function lintInChildProcess(options, prelude = '') {
  return runInChildProcess(
    `
      import v8 from 'node:v8';
      import stylelint from 'stylelint';
      ${prelude}
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const options = v8.deserialize(Buffer.concat(chunks));
      const { code, results } = await stylelint.lint({ ...options, quietDeprecationWarnings: true });
      console.log(
        JSON.stringify({
          code,
          results: results.map(({ warnings, invalidOptionWarnings, errored }) => ({
            warnings,
            invalidOptionWarnings,
            errored,
          })),
        }),
      );
    `,
    { input: v8.serialize(options) },
  );
}
