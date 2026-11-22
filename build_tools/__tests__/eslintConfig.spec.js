import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT_DIR = path.resolve(__dirname, '../..');
const CONFIG_FILE = path.join(ROOT_DIR, 'eslint.config.mjs');
const FILE_PATH = path.join(ROOT_DIR, 'kolibri/core/frontend/smokeTest.js');
const BUILT_CONFIG_FILE = path.join(ROOT_DIR, 'build_tools/eslint.built.config.mjs');
const POLYFILLS_PATH = 'kolibri/core/static/kolibri.core.polyfills/smokeTest.js';
const FRONTEND_PATH = 'kolibri/core/static/kolibri.core.default_frontend/chunks/smokeTest.js';
const CORE_ENTRY_PATH =
  'kolibri/core/static/kolibri.core.default_frontend/kolibri.core.default_frontend-smokeTest.js';
const SANDBOX_PATH = 'kolibri/core/content/static/sandbox/smokeTest.js';
const PERSEUS_PATH =
  'kolibri/plugins/perseus_viewer/static/kolibri.plugins.perseus_viewer.main/kolibri.plugins.perseus_viewer.main-smokeTest.js';
const MEDIA_PLAYER_PATH =
  'kolibri/plugins/media_player/static/kolibri.plugins.media_player.main/kolibri.plugins.media_player.main-smokeTest.js';
const QTI_PATH =
  'kolibri/plugins/qti_viewer/static/kolibri.plugins.qti_viewer.main/kolibri.plugins.qti_viewer.main-smokeTest.js';
const TIMEOUT = 30000;

function inChildProcess(body, configFile = CONFIG_FILE, cwd = ROOT_DIR) {
  const script = `
    import { ESLint } from 'eslint';
    const linter = new ESLint(${JSON.stringify({ overrideConfigFile: configFile, cwd })});
    ${body}
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
  });
  return JSON.parse(output.trim());
}

function ruleSeveritiesFor(code, filePath = FILE_PATH, configFile = CONFIG_FILE) {
  return inChildProcess(
    `
    const [result] = await linter.lintText(${JSON.stringify(code)}, {
      filePath: ${JSON.stringify(filePath)},
    });
    if (result.fatalErrorCount) throw new Error(result.messages[0].message);
    console.log(JSON.stringify(result.messages
      .filter(message => message.messageId && message.ruleId)
      .map(message => [message.ruleId, message.severity])));
  `,
    configFile,
  );
}

function lintMessagesFor(code, filePath, configFile) {
  return inChildProcess(
    `
    const [result] = await linter.lintText(${JSON.stringify(code)}, {
      filePath: ${JSON.stringify(filePath)},
    });
    console.log(JSON.stringify(result.messages.map(message => message.message)));
  `,
    configFile,
  );
}

describe('Browser cutoff source lint', () => {
  it(
    'reports unsupported built-ins in Vue template expressions',
    () => {
      const code = `<template>
      <div v-if="items.length &gt; 0 &amp;&amp; URL.canParse(input)">{{ Object.keys(Object.groupBy(items, groupKey)).length }}</div>
    </template>`;
      const filePath = FILE_PATH.replace(/\.js$/, '.vue');
      const messages = lintMessagesFor(code, filePath, CONFIG_FILE);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('es-x/no-object-groupby'),
          expect.stringContaining('cutoff/no-excluded-web-api'),
        ]),
      );
    },
    TIMEOUT,
  );

  it(
    'does not confuse a Vue template binding with a browser global',
    () => {
      const code = `<template><ul>
      <li v-for="Object in items" :key="Object.id">{{ Object.groupBy() }}</li>
    </ul></template>`;
      expect(ruleSeveritiesFor(code, FILE_PATH.replace(/\.js$/, '.vue'))).not.toContainEqual([
        'template/cutoff',
        2,
      ]);
    },
    TIMEOUT,
  );

  it(
    'allows newer built-ins in Node-only build tooling',
    () => {
      const code = 'export default value => value.isWellFormed();';
      expect(ruleSeveritiesFor(code, 'build_tools/smokeTest.mjs')).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    'reports unsupported built-ins as errors',
    () => {
      const code = `export function probe(items, key, other, encoded) {
        Object.groupBy(items, key);
        items.union(other);
        items.with(0, 1);
        Uint8Array.fromBase64(encoded);
      }`;
      expect(ruleSeveritiesFor(code)).toEqual(
        expect.arrayContaining([
          ['es-x/no-object-groupby', 2],
          ['es-x/no-set-prototype-union', 2],
          ['es-x/no-array-prototype-with', 2],
          ['es-x/no-uint8array-frombase64', 2],
        ]),
      );
    },
    TIMEOUT,
  );

  it(
    'reports Intl built-ins newer than Firefox 115',
    () => {
      const code = `export function probe(nf, pr, s) {
        new Intl.Segmenter('en').segment(s);
        nf.formatRange(1, 2);
        nf.formatRangeToParts(1, 2);
        pr.selectRange(1, 2);
      }`;
      expect(ruleSeveritiesFor(code)).toEqual(
        expect.arrayContaining([
          ['es-x/no-intl-segmenter', 2],
          ['es-x/no-intl-numberformat-prototype-formatrange', 2],
          ['es-x/no-intl-numberformat-prototype-formatrangetoparts', 2],
          ['es-x/no-intl-pluralrules-prototype-selectrange', 2],
        ]),
      );
    },
    TIMEOUT,
  );

  it(
    'reports each unsupported built-in once',
    () => {
      const code = 'export default (xs, k, s) => [Object.groupBy(xs, k), s.isWellFormed()];';
      expect(ruleSeveritiesFor(code)).toEqual([
        ['es-x/no-object-groupby', 2],
        ['es-x/no-string-prototype-iswellformed', 2],
      ]);
    },
    TIMEOUT,
  );

  it(
    'applies the browser cutoff to bundled kolibri-logging',
    () => {
      const code = 'export default s => s.isWellFormed();';
      const filePath = path.join(ROOT_DIR, 'packages/kolibri-logging/smokeTest.js');
      expect(ruleSeveritiesFor(code, filePath)).toEqual([
        ['es-x/no-string-prototype-iswellformed', 2],
      ]);
    },
    TIMEOUT,
  );

  it(
    'accepts ES2023 array copying and untyped methods with overlapping names',
    () => {
      const code = `export function probe(items, map, filter, resizable) {
        resizable.resize();
        return items.map(map).filter(filter).toReversed();
      }`;
      expect(ruleSeveritiesFor(code)).toEqual([]);
    },
    TIMEOUT,
  );

  it.each([
    ['python_packages/kolibri-sentry-plugin/kolibri_sentry_plugin/assets/src', 'mjs'],
    ['python_packages/kolibri-demo-server-plugin/kolibri_demo_server_plugin/frontend', 'js'],
  ])(
    'lint-frontend applies the browser cutoff to %s',
    (directory, extension) => {
      const tempDir = mkdtempSync(path.join(ROOT_DIR, directory, 'cutoffProbe-'));
      try {
        const probe = path.join(tempDir, `probe.${extension}`);
        writeFileSync(probe, 'export default (xs, k) => Object.groupBy(xs, k);\n');
        const { status, stdout, stderr } = spawnSync(
          'pnpm',
          ['run', 'lint-frontend', '--', path.relative(ROOT_DIR, probe)],
          { cwd: ROOT_DIR, encoding: 'utf-8' },
        );
        expect(status).toBe(1);
        expect(stdout + stderr).toContain('es-x/no-object-groupby');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );
});

describe.each([
  [FILE_PATH, CONFIG_FILE],
  [FRONTEND_PATH, BUILT_CONFIG_FILE],
])('Shared browser cutoff in %s', (filePath, configFile) => {
  it(
    'rejects Web APIs missing from the narrowed polyfill bundle',
    () => {
      const rules = ruleSeveritiesFor(
        'URL.parse(input).searchParams.size; URL.canParse(input);',
        filePath,
        configFile,
      );
      expect(rules.filter(([rule]) => rule === 'cutoff/no-excluded-web-api')).toHaveLength(3);
    },
    TIMEOUT,
  );

  it(
    'rejects iterator helpers only on known iterators passed to local functions',
    () => {
      const code = `function drain(iterator) { iterator.map(String); return iterator.toArray(); }
      function transform(items) { return items.map(String); }
      drain([1].values());
      transform([1]);`;
      expect(ruleSeveritiesFor(code, filePath, configFile)).toEqual([
        ['es-x/no-iterator-prototype-map', 2],
        ['es-x/no-iterator-prototype-toarray', 2],
      ]);
    },
    TIMEOUT,
  );

  it.each([
    ['DateTimeFormat', []],
    ['NumberFormat', [['es-x/no-intl-numberformat-prototype-formatrange', 2]]],
  ])(
    'checks formatRange when a local function receives an Intl.%s',
    (constructor, expected) => {
      const code = `function format(formatter, start, end) { return formatter.formatRange(start, end); }
      format(new Intl.${constructor}('en'), 1, 2);`;
      expect(ruleSeveritiesFor(code, filePath, configFile)).toEqual(expected);
    },
    TIMEOUT,
  );
});

describe('Browser cutoff built-output lint', () => {
  it(
    'ignores the polyfill bundle but not the frontend bundle',
    () => {
      const ignored = inChildProcess(
        `
        console.log(JSON.stringify(await Promise.all(
          ${JSON.stringify([POLYFILLS_PATH, FRONTEND_PATH])}.map(file => linter.isPathIgnored(file))
        )));
      `,
        BUILT_CONFIG_FILE,
      );
      expect(ignored).toEqual([true, false]);
    },
    TIMEOUT,
  );

  it.each([FRONTEND_PATH, SANDBOX_PATH])(
    'reports unsupported built-ins despite inline directives in %s',
    filePath => {
      const code = `/* eslint-disable es-x/no-uint8array-frombase64 */
        Uint8Array.fromBase64('');`;
      expect(ruleSeveritiesFor(code, filePath, BUILT_CONFIG_FILE)).toContainEqual([
        'es-x/no-uint8array-frombase64',
        2,
      ]);
    },
    TIMEOUT,
  );

  it.each(['typeof Iterator === "function"', '"function" == typeof Iterator'])(
    "accepts SWC's generator helper in any bundle",
    guard => {
      const code = `var g = Object.create((${guard} ? Iterator : Object).prototype);`;
      expect(lintMessagesFor(code, MEDIA_PLAYER_PATH, BUILT_CONFIG_FILE)).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    'accepts Iterator as a property name in any bundle',
    () => {
      const code = 'a.Iterator = 1; var o = { Iterator: 1 };';
      expect(lintMessagesFor(code, MEDIA_PLAYER_PATH, BUILT_CONFIG_FILE)).toEqual([]);
    },
    TIMEOUT,
  );

  it.each([
    'Iterator.from(e);',
    'globalThis.Iterator.from(e);',
    'globalThis["Iterator"].from(e);',
    'class X extends Iterator {}',
    'var X = class extends Iterator {};',
    'new Iterator();',
    'x instanceof Iterator;',
    'var I = Iterator; I.from([]);',
    'Reflect.construct(Iterator, [], Object);',
    '"u" < typeof Iterator ? Iterator : Object;',
    'typeof Iterator !== "function" ? Iterator : Object;',
    'const {Iterator: Alias} = globalThis; new Alias();',
    'const {Float16Array: Alias} = globalThis; new Alias(1);',
  ])(
    'rejects unguarded %s in any bundle',
    code => {
      expect(ruleSeveritiesFor(code, MEDIA_PLAYER_PATH, BUILT_CONFIG_FILE)).toEqual([
        ['built/no-unguarded-constructors', 2],
      ]);
    },
    TIMEOUT,
  );

  it.each(['Iterator', 'Float16Array'])(
    'accepts local bindings named %s',
    name => {
      const code = `function ${name}() {} new ${name}();`;
      expect(lintMessagesFor(code, MEDIA_PLAYER_PATH, BUILT_CONFIG_FILE)).toEqual([]);
    },
    TIMEOUT,
  );

  it.each([
    '"u" < typeof Float16Array ? void 0 : Float16Array',
    'typeof Float16Array === "undefined" ? undefined : Float16Array',
  ])(
    "accepts get-intrinsic's guarded Float16Array read: %s",
    expression => {
      const code = `var intrinsic = ${expression};`;
      expect(lintMessagesFor(code, CORE_ENTRY_PATH, BUILT_CONFIG_FILE)).toEqual([]);
    },
    TIMEOUT,
  );

  it.each([
    'new Float16Array(2);',
    'new globalThis.Float16Array(2);',
    'var intrinsic = typeof Float16Array === "undefined" ? Float16Array : fallback;',
  ])(
    'rejects unguarded %s in the core entry bundle',
    code => {
      expect(ruleSeveritiesFor(code, CORE_ENTRY_PATH, BUILT_CONFIG_FILE)).toEqual([
        ['built/no-unguarded-constructors', 2],
      ]);
    },
    TIMEOUT,
  );

  it.each([QTI_PATH, PERSEUS_PATH])(
    'rejects unguarded formatRange calls in %s',
    filePath => {
      const unguarded = 'function probe(nf) { nf.formatRange(1, 2); nf.formatRangeToParts(1, 2); }';
      expect(ruleSeveritiesFor(unguarded, filePath, BUILT_CONFIG_FILE)).toEqual([
        ['es-x/no-intl-numberformat-prototype-formatrange', 2],
        ['es-x/no-intl-numberformat-prototype-formatrangetoparts', 2],
      ]);
    },
    TIMEOUT,
  );

  it(
    'exempts only the guarded NumberFormatter expression in a mixed bundle',
    () => {
      const cwd = mkdtempSync(path.join(tmpdir(), 'kolibri-built-lint-'));
      try {
        const filePath = path.join(cwd, PERSEUS_PATH);
        const guarded = "if (typeof this.numberFormatter.formatRange === 'function') {";
        const call = 'return this.numberFormatter.formatRange(start, end);';
        const dependency = [guarded, call, '}', call].join('\n');
        const app = 'formatter.formatRange(start, end);';
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, '');
        const bundle = ['function probe() {', dependency, '}', app].join('\n');
        writeFileSync(`${filePath}.gz`, gzipSync(bundle));
        writeFileSync(
          `${filePath}.map.gz`,
          gzipSync(
            JSON.stringify({
              version: 3,
              sources: [
                'webpack://kolibri/packages/@internationalized/number/src/NumberFormatter.ts',
                'webpack://kolibri/app.js',
              ],
              sourcesContent: [dependency, app],
              names: [],
              mappings: ';WAAW;OACJ;;OAEA;;ACHP',
            }),
          ),
        );
        expect(
          inChildProcess(
            `const [result] = await linter.lintFiles(${JSON.stringify(PERSEUS_PATH)});
           console.log(JSON.stringify(result.messages.map(({ ruleId, line }) => [ruleId, line])));`,
            BUILT_CONFIG_FILE,
            cwd,
          ),
        ).toEqual([
          ['es-x/no-intl-numberformat-prototype-formatrange', 5],
          ['es-x/no-intl-numberformat-prototype-formatrange', 7],
        ]);

        const rawDependency = 'this.options.intersection;';
        writeFileSync(filePath, [rawDependency, 'other.intersection;'].join('\n'));
        writeFileSync(
          `${filePath}.map`,
          JSON.stringify({
            version: 3,
            sources: [
              'webpack://kolibri/node_modules/vue-observe-visibility/dist/vue-observe-visibility.esm.js',
              'webpack://kolibri/app.js',
            ],
            sourcesContent: [rawDependency, 'other.intersection;'],
            names: [],
            mappings: 'AAAA;ACAA',
          }),
        );
        const mixedMessages = inChildProcess(
          `const [result] = await linter.lintFiles(${JSON.stringify(PERSEUS_PATH)});
           console.log(JSON.stringify(result.messages.map(({ ruleId, line }) => [ruleId, line])));`,
          BUILT_CONFIG_FILE,
          cwd,
        );
        expect(mixedMessages).toEqual([
          ['es-x/no-set-prototype-intersection', 2],
          ['es-x/no-intl-numberformat-prototype-formatrange', 5],
          ['es-x/no-intl-numberformat-prototype-formatrange', 7],
        ]);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );

  it.each([CORE_ENTRY_PATH, SANDBOX_PATH])(
    'rejects unguarded ArrayBuffer transfer in %s',
    filePath => {
      const code = 'function transfer(buffer) { return buffer.transfer(0); }';
      expect(ruleSeveritiesFor(code, filePath, BUILT_CONFIG_FILE)).toEqual([
        ['es-x/no-arraybuffer-prototype-transfer', 2],
      ]);
    },
    TIMEOUT,
  );

  it(
    'rejects unguarded Symbol.dispose in the Perseus bundle',
    () => {
      const code = 'cleanup[Symbol.dispose] = cleanup;';
      expect(ruleSeveritiesFor(code, PERSEUS_PATH, BUILT_CONFIG_FILE)).toContainEqual([
        'es-x/no-symbol-dispose',
        2,
      ]);
    },
    TIMEOUT,
  );

  it.each([
    ['', true],
    ['', false],
    ['void 0;', false],
  ])(
    'reports unsupported built-ins in gzip with primary %j and size metadata %s',
    (primary, hasSizeMetadata) => {
      const cwd = mkdtempSync(path.join(tmpdir(), 'kolibri-built-lint-'));
      try {
        const filePath = path.join(cwd, FRONTEND_PATH);
        const code = 'Object.groupBy([], String);';
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, primary);
        writeFileSync(`${filePath}.gz`, gzipSync(code));
        if (hasSizeMetadata)
          writeFileSync(`${filePath}.file_size`, String(Buffer.byteLength(code)));
        const ruleIds = inChildProcess(
          `
          const [result] = await linter.lintFiles(${JSON.stringify(FRONTEND_PATH)});
          console.log(JSON.stringify(result.messages.map(message => message.ruleId)));
          `,
          BUILT_CONFIG_FILE,
          cwd,
        );
        expect(ruleIds).toContain('es-x/no-object-groupby');
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );
});
