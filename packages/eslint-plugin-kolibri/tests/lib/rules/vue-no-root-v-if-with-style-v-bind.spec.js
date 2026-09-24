const pluginVue = require('eslint-plugin-vue');
const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-root-v-if-with-style-v-bind');
const { vueLanguageOptions } = require('../../helpers');

// The rule delegates to this one, so an eslint-plugin-vue upgrade that drops it must fail
// here rather than when someone next runs the linter.
describe('vue-no-root-v-if-with-style-v-bind', () => {
  it('delegates to a rule eslint-plugin-vue still provides', () => {
    expect(pluginVue.rules[rule.upstreamRuleName]).toBeTruthy();
  });
});

const ruleTester = new RuleTester({
  languageOptions: vueLanguageOptions,
});

/**
 * A single file component with `template` as its template body and `style` as the
 * contents of its one style block.
 * @param {string} template - The template body.
 * @param {string} style - The style block body.
 * @returns {string}
 */
function sfc(template, style) {
  return `<template>${template}</template>
<style lang="scss" scoped>
  ${style}
</style>
`;
}

const ROOT_V_IF = '<div v-if="show" class="a">a</div>';
const V_BIND_STYLE = '.a { color: v-bind(surfaceColor); }';
const PLAIN_STYLE = '.a { color: var(--tokens-surface); }';

ruleTester.run('vue-no-root-v-if-with-style-v-bind', rule, {
  valid: [
    {
      // the case `vue/no-root-v-if` reports and this rule does not: no `v-bind()` means
      // there is nothing the re-insertion can stop updating
      filename: 'NoVBind.vue',
      code: sfc(ROOT_V_IF, PLAIN_STYLE),
    },
    {
      // the conditional element is wrapped, which is the fix the message asks for
      filename: 'Wrapped.vue',
      code: sfc('<div><span v-if="show" class="a">a</span></div>', V_BIND_STYLE),
    },
    {
      // Known limit, inherited from `vue/no-root-v-if`, which counts root elements: a
      // `v-if`/`v-else` pair is two of them, so neither rule reports it. The pair is only
      // safe while both branches use the same tag. Different tags, or a `v-else-if` chain
      // whose conditions are all false, replace the root element, and Vue 2.7 re-applies
      // the injected variables only when a theme value next changes.
      filename: 'WithElse.vue',
      code: sfc('<div v-if="show" class="a">a</div><div v-else class="a">b</div>', V_BIND_STYLE),
    },
    {
      // no style block at all
      filename: 'NoStyle.vue',
      code: `<template>${ROOT_V_IF}</template>\n`,
    },
  ],
  invalid: [
    {
      filename: 'Invalid.vue',
      code: sfc(ROOT_V_IF, V_BIND_STYLE),
      errors: [{ messageId: 'noRootVIf' }],
    },
    {
      // the `v-bind()` is in the second of two style blocks
      filename: 'SecondBlock.vue',
      code: `<template>${ROOT_V_IF}</template>
<style lang="scss" scoped>
  ${PLAIN_STYLE}
</style>
<style>
  ${V_BIND_STYLE}
</style>
`,
      errors: [{ messageId: 'noRootVIf' }],
    },
  ],
});
