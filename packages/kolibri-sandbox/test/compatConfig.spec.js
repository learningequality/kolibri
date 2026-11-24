import { execFileSync } from 'node:child_process';
import path from 'node:path';

const SANDBOX_DIR = path.resolve(__dirname, '..');

function ruleIdsFor(code, filePath = 'src/smokeTest.js') {
  const script = `
    import { ESLint } from 'eslint';
    const linter = new ESLint({ overrideConfigFile: 'compat.js' });
    const [result] = await linter.lintText(${JSON.stringify(code)}, { filePath: ${JSON.stringify(filePath)} });
    if (result.fatalErrorCount) throw new Error(result.messages[0].message);
    console.log(JSON.stringify(result.messages.map(message => message.ruleId)));
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: SANDBOX_DIR,
    encoding: 'utf-8',
    timeout: 10000,
  });
  return JSON.parse(output.trim());
}

describe('Sandbox compat lint', () => {
  it.each(['src/nested/probe.js', 'src/probe.mjs'])(
    'checks Web APIs in %s',
    filePath => {
      expect(ruleIdsFor('new EyeDropper();', filePath)).toContain('compat/compat');
    },
    30000,
  );

  it.each([
    'URL.canParse(input);',
    'URL.parse(input);',
    'new URLSearchParams().has("name", "value");',
    'const params = new URLSearchParams(); params.delete("name", "value");',
    'new URL(input).searchParams.has(...["name", "value"]);',
    'new URL(input).searchParams.delete(...["name", ...["value"]]);',
    'new URLSearchParams().has(...args);',
    'function probe(undefined) { new URLSearchParams().has("name", undefined); }',
    'new URL(input).searchParams.has("name", undefined);',
    'new URL(input).searchParams.delete("name", void 0);',
    'new URL(input).searchParams.delete(...["name", , "ignored"]);',
    'function check(url) { return url.searchParams.has("name", "expected"); } check(new URL(input));',
    'function remove(url) { const params = url["searchParams"]; params.delete("name", "expected"); } remove(new URL(input));',
    'const args = ["name"]; args.push("value"); new URL(input).searchParams.has(...args);',
    'const args = [...args]; new URL(input).searchParams.has(...args);',
    'new URLSearchParams().size;',
    'function count(url) { return url.searchParams.size; } count(new URL(input));',
    'function check(url) { const { searchParams } = url; return searchParams.has("x", "2"); }',
    'const params = new URLSearchParams("x=1"); params.has.call(params, "x", "2");',
    'const params = new URLSearchParams("x=1"); const remove = params.delete; remove.call(params, "x", "2");',
    'setImmediate(callback);',
    'clearImmediate(handle);',
    'new DOMException().stack;',
    'structuredClone(value);',
  ])(
    'rejects excluded Web API usage: %s',
    code => {
      expect(ruleIdsFor(code)).toContain('cutoff/no-excluded-web-api');
    },
    30000,
  );

  it('keeps the URL constructor exemption and does not ban single-argument search methods', () => {
    const rules = ruleIdsFor(`
      new URL(input);
      const params = new URLSearchParams('name=value');
      params.has('name');
      params.delete('name');
      params.has.call(params, 'name');
      function check(url) { const { searchParams } = url; searchParams.has('name'); }
    `);
    expect(rules).toEqual([]);
  }, 30000);

  it('accepts array spreads that cannot supply a second search argument', () => {
    expect(
      ruleIdsFor(`
      const params = new URL(input).searchParams;
      const args = ['name'];
      params.has(...args);
      params.has(...['name'], ...[]);
      params.delete(...[...args]);
      function check(url) { return url.searchParams.has(...args); }
    `),
    ).toEqual([]);
  }, 30000);

  it('checks nested empty spreads without expanding each path through the aliases', () => {
    const aliases = Array.from({ length: 30 }, (_, index) => {
      return `const args${index + 1} = [...args${index}, ...args${index}];`;
    });
    expect(
      ruleIdsFor(
        ['const args0 = [];', ...aliases, 'new URLSearchParams().has("x", ...args30);'].join('\n'),
      ),
    ).toEqual([]);
  }, 30000);

  it('reports each excluded API once through converging constructor aliases', () => {
    const aliases = Array.from({ length: 10 }, (_, index) => {
      const previous = `alias${index}`;
      return `const alias${index + 1} = embedded ? ${previous} : ${previous};`;
    });
    const rules = ruleIdsFor(
      [
        'const alias0 = embedded ? window.URL : self.URL;',
        ...aliases,
        'alias10.parse(input);',
      ].join('\n'),
    );
    expect(rules.filter(rule => rule === 'cutoff/no-excluded-web-api')).toHaveLength(1);
  }, 30000);

  it('reports built-ins beyond the browser cutoff', () => {
    expect(ruleIdsFor('export function probe(xs, f) { return Object.groupBy(xs, f); }')).toContain(
      'es-x/no-object-groupby',
    );
  }, 30000);

  it('accepts document.body', () => {
    expect(ruleIdsFor('export const body = document.body;')).toEqual([]);
  }, 30000);
});
