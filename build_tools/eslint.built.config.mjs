import { existsSync, readFileSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { gunzipSync } from 'node:zlib';
import { ReferenceTracker, READ } from '@eslint-community/eslint-utils';
import { defineConfig } from 'eslint/config';
import cutoffConfig from './eslint.cutoff.config.js';

const sandbox = 'kolibri/core/content/static/sandbox/*.js';
const arrayBufferTransfer = 'es-x/no-arraybuffer-prototype-transfer';

function guardedStreamProperty(lines, line, column) {
  const guards = /"(function|boolean)"==typeof (\w+)\.(transfer|detached)\?\2=>\2\.\3\b/g;
  return Array.from(lines[line].matchAll(guards)).some(
    match =>
      (match[1] === 'function') === (match[3] === 'transfer') &&
      column >= match.index &&
      column < match.index + match[0].length,
  );
}

function guardedNumberRange(lines, line, column) {
  const member = /^this\.numberFormatter\.formatRange(?:ToParts)?\b/.exec(
    lines[line].slice(column),
  )?.[0];
  if (!member) return false;
  const guard = `if (typeof ${member} === 'function') {`;
  const call = `return ${member}(start, end);`;
  return (
    (lines[line].trim() === guard && lines[line + 1]?.trim() === call) ||
    (lines[line].trim() === call && lines[line - 1]?.trim() === guard)
  );
}

const dependencyExpressions = {
  [arrayBufferTransfer]: [
    [/\/node_modules\/vue\/dist\/vue\.runtime\.common\.prod\.js$/, /^this\.detached\b/],
    [
      /\/node_modules\/core-js\/modules\/web\.structured-clone\.js$/,
      /^options\.transfer : undefined;/,
    ],
    [/\/node_modules\/web-streams-polyfill\/dist\/ponyfill\.js$/, guardedStreamProperty],
  ],
  'es-x/no-set-prototype-intersection': [
    [/\/pdfjs-dist\/build\/pdf\.worker\/src\/core\/metrics\.js$/, /^\w+\.intersection = \d+;/],
    [
      /\/node_modules\/vue-observe-visibility\/dist\/vue-observe-visibility\.esm\.js$/,
      /^this\.options\.intersection\b/,
    ],
  ],
  'es-x/no-set-prototype-union': [
    [/\/pdfjs-dist\/build\/pdf\.worker\/src\/core\/metrics\.js$/, /^\w+\.union = \d+;/],
  ],
  'es-x/no-uint8array-prototype-tohex': [
    [/\/node_modules\/tinycolor2\/esm\/tinycolor\.js$/, /^this\.toHex\(allow3Char\)/],
    [
      /\/node_modules\/speech-rule-engine\/js\/highlighter\/color_picker\.js$/,
      /^ColorPicker\.toHex\(col\.(red|green|blue)\)/,
    ],
  ],
  'es-x/no-intl-numberformat-prototype-formatrange': [
    [/\/packages\/@internationalized\/number\/src\/NumberFormatter\.ts$/, guardedNumberRange],
  ],
  'es-x/no-intl-numberformat-prototype-formatrangetoparts': [
    [/\/packages\/@internationalized\/number\/src\/NumberFormatter\.ts$/, guardedNumberRange],
  ],
};

function readGzip(filePath) {
  return gunzipSync(readFileSync(`${filePath}.gz`)).toString('utf8');
}

function readAsset(filePath, compressed) {
  if (compressed) return existsSync(`${filePath}.gz`) ? readGzip(filePath) : '';
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function filterDependencyMessages(messages, filePath, compressed) {
  if (!messages.some(({ ruleId }) => Object.hasOwn(dependencyExpressions, ruleId))) return messages;

  if (
    /\/kolibri\/core\/content\/static\/sandbox\/[^/]+\.js$/.test(filePath.replaceAll('\\', '/'))
  ) {
    const lines = readAsset(filePath, compressed).split('\n');
    return messages.filter(({ ruleId, line, column }) => {
      if (ruleId !== arrayBufferTransfer) return true;
      const text = lines[line - 1] || '';
      return !(
        /this\.byteLength=\w+,$/.test(text.slice(Math.max(0, column - 50), column - 1)) &&
        /^this\.detached=!1\b/.test(text.slice(column - 1, column + 20))
      );
    });
  }

  const mapText = readAsset(`${filePath}.map`, compressed);
  if (!mapText) return messages;
  const payload = JSON.parse(mapText);
  const sourceMap = new SourceMap(payload);
  const sources = new Map();
  return messages.filter(({ ruleId, line, column }) => {
    const exceptions = dependencyExpressions[ruleId];
    if (!exceptions) return true;
    const { originalSource, originalLine, originalColumn } = sourceMap.findEntry(
      line - 1,
      column - 1,
    );
    const matching = exceptions.filter(([sourcePath]) => sourcePath.test(originalSource));
    if (!matching.length) return true;
    if (!sources.has(originalSource)) {
      const original = payload.sourcesContent?.[payload.sources.indexOf(originalSource)];
      sources.set(originalSource, original?.split('\n') || []);
    }
    const lines = sources.get(originalSource);
    if (!lines[originalLine]) return true;
    return !matching.some(([, pattern]) =>
      typeof pattern === 'function'
        ? pattern(lines, originalLine, originalColumn)
        : pattern.test(lines[originalLine].slice(originalColumn)),
    );
  });
}

const compressedAssetProcessor = {
  preprocess(text, filePath) {
    if (existsSync(`${filePath}.gz`) || (!text && existsSync(`${filePath}.file_size`))) {
      const compressedText = readGzip(filePath);
      return text ? [text, compressedText] : [compressedText];
    }
    return [text];
  },
  postprocess(blocks, filePath) {
    const hasGzip = existsSync(`${filePath}.gz`);
    return blocks.flatMap((messages, index) =>
      filterDependencyMessages(messages, filePath, hasGzip && index === blocks.length - 1),
    );
  },
};

const constructors = ['Iterator', 'Float16Array'];
const globalObjects = ['global', 'globalThis', 'self', 'window'];

function pluginBundle(name) {
  const [plugin] = name.split('.');
  const bundle = `kolibri.plugins.${name}`;
  return `kolibri/plugins/${plugin}/static/${bundle}/${bundle}-*.js`;
}

function isTypeof(node, name) {
  return (
    node.type === 'UnaryExpression' &&
    node.operator === 'typeof' &&
    node.argument.type === 'Identifier' &&
    node.argument.name === name
  );
}

function isGuardedRead(node, name) {
  const parent = node.parent;
  if (parent.type === 'UnaryExpression' && parent.operator === 'typeof') return true;
  if (node.type !== 'Identifier' || parent.type !== 'ConditionalExpression') return false;
  const { test, consequent, alternate } = parent;
  if (test.type !== 'BinaryExpression') return false;
  const { left, right, operator } = test;
  if (name === 'Iterator' && node === consequent && ['==', '==='].includes(operator)) {
    return (
      (isTypeof(left, name) && right.value === 'function') ||
      (isTypeof(right, name) && left.value === 'function')
    );
  }
  if (name !== 'Float16Array' || node !== alternate) return false;
  return (
    (operator === '<' && left.value === 'u' && isTypeof(right, name)) ||
    (['==', '==='].includes(operator) &&
      ((isTypeof(left, name) && right.value === 'undefined') ||
        (isTypeof(right, name) && left.value === 'undefined')))
  );
}

const noUnguardedConstructors = {
  meta: {
    messages: { cutoff: '{{name}} is newer than the browser cutoff; guard it with typeof.' },
  },
  create(context) {
    return {
      'Program:exit'(program) {
        const tracker = new ReferenceTracker(context.sourceCode.getScope(program), {
          globalObjectNames: globalObjects,
        });
        const trace = Object.fromEntries(constructors.map(name => [name, { [READ]: true }]));
        for (const {
          node,
          path: [name],
        } of tracker.iterateGlobalReferences(trace)) {
          if (!isGuardedRead(node, name)) {
            context.report({ node, messageId: 'cutoff', data: { name } });
          }
        }
      },
    };
  },
};

export default defineConfig([
  { ignores: ['kolibri/core/static/kolibri.core.polyfills/**'] },
  {
    files: ['kolibri/**/static/kolibri.*/**/*.js', sandbox],
    extends: cutoffConfig,
    processor: compressedAssetProcessor,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: Object.fromEntries(
        [...constructors, ...globalObjects].map(name => [name, 'readonly']),
      ),
    },
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
    plugins: { built: { rules: { 'no-unguarded-constructors': noUnguardedConstructors } } },
    rules: {
      'es-x/no-iterator': 'off',
      'es-x/no-float16array': 'off',
      'built/no-unguarded-constructors': 'error',
    },
  },
  {
    files: [pluginBundle('perseus_viewer.main')],
    rules: {
      // Preact Signals returns a callable disposer independently of Symbol.dispose.
      'es-x/no-symbol-dispose': ['error', { allowTestedProperty: true }],
    },
  },
]);
