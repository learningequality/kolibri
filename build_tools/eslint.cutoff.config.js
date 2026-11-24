const esX = require('eslint-plugin-es-x');
const { ecmaVersion } = require('browserslist-config-kolibri/cutoff');
const { noExcludedWebApi, webGlobals } = require('./eslint.cutoff-web');
const {
  withIteratorArguments,
  withDateFormatterArguments,
} = require('./eslint.cutoff-local-calls');

const rules = {};
for (const [name, rule] of Object.entries(esX.rules)) {
  const year = /^ES(\d{4})/.exec(rule.meta.docs.category)?.[1];
  if (Number(year) > ecmaVersion && !rule.meta.deprecated) {
    rules[`es-x/${name}`] = 'error';
  }
}

const iteratorMethods = [
  'drop',
  'every',
  'filter',
  'find',
  'flatMap',
  'forEach',
  'map',
  'reduce',
  'some',
  'take',
  'toArray',
];
const esXRules = { ...esX.rules };
for (const method of iteratorMethods) {
  const name = `no-iterator-prototype-${method.toLowerCase()}`;
  rules[`es-x/${name}`] = ['error', { aggressive: false }];
  esXRules[name] = withIteratorArguments(esXRules[name], method);
}
for (const name of [
  'no-intl-numberformat-prototype-formatrange',
  'no-intl-numberformat-prototype-formatrangetoparts',
]) {
  esXRules[name] = withDateFormatterArguments(esXRules[name]);
}
rules['es-x/no-resizable-and-growable-arraybuffers'] = ['error', { aggressive: false }];
// es-x files this under ES2023, but core-js dates Firefox support to 140.
rules['es-x/no-array-prototype-with'] = 'error';
// MDN BCD dates Firefox support to 125 (Segmenter) and 116 (formatRange, selectRange).
for (const rule of [
  'no-intl-segmenter',
  'no-intl-numberformat-prototype-formatrange',
  'no-intl-numberformat-prototype-formatrangetoparts',
  'no-intl-pluralrules-prototype-selectrange',
]) {
  rules[`es-x/${rule}`] = 'error';
}

module.exports = [
  {
    ...esX.configs[`flat/restrict-to-es${ecmaVersion}`],
    plugins: { 'es-x': { ...esX, rules: esXRules } },
  },
  {
    settings: { 'es-x': { aggressive: true } },
    languageOptions: { globals: webGlobals },
    plugins: { cutoff: { rules: { 'no-excluded-web-api': noExcludedWebApi } } },
    rules: { ...rules, 'cutoff/no-excluded-web-api': 'error' },
  },
];
