const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-theme-tokens-in-v-bind');
const { vueLanguageOptions } = require('../../helpers');

const ruleTester = new RuleTester({
  languageOptions: vueLanguageOptions,
});

/**
 * A single file component whose one style rule contains `declarations`.
 * @param {string} declarations - The body of the component's one style rule.
 * @returns {string}
 */
function sfc(declarations) {
  return `<template><div class="a" /></template>
<style lang="scss" scoped>
  .a { ${declarations} }
</style>
`;
}

/**
 * An invalid case the rule rewrites, given the two halves of the declaration.
 * @param {string} declarations - The style rule body before the rule runs.
 * @param {string} fixed - The same body once the rule has rewritten it.
 * @returns {object}
 */
function fixes(declarations, fixed) {
  return {
    filename: 'Invalid.vue',
    code: sfc(declarations),
    output: sfc(fixed),
    errors: [{ messageId: 'unexpectedThemeWithVariable' }],
  };
}

const themed = { messageId: 'unexpectedTheme' };
const withVariable = { messageId: 'unexpectedThemeWithVariable' };

ruleTester.run('vue-no-theme-tokens-in-v-bind', rule, {
  valid: [
    {
      // the migration target, and the only style block with nothing to report
      filename: 'Valid.vue',
      code: sfc('color: var(--tokens-primary);'),
    },
    {
      // a member that reads the theme cannot be rewritten, so it is not matched
      filename: 'Valid.vue',
      code: `<template><div class="a" /></template>
<script>
  export default {
    computed: {
      surfaceColor() {
        return this.$themeTokens.surface;
      },
    },
  };
</script>
<style lang="scss" scoped>
  .a { background: v-bind(surfaceColor); }
</style>
`,
    },
    {
      // outside a style block the theme is read normally
      filename: 'Valid.vue',
      code: `<script>
  import { themeTokens } from '../styles/theme';
  export default {
    computed: {
      color() {
        return themeTokens().primary;
      },
    },
  };
</script>
`,
    },
    {
      // a property read off another object only shares a theme property's name
      filename: 'Valid.vue',
      code: sfc("color: v-bind('styles.$themeTokens');"),
    },
  ],
  invalid: [
    fixes('color: v-bind("themeTokens().primary");', 'color: var(--tokens-primary);'),
    fixes("background: v-bind('this.$themeTokens.surface');", 'background: var(--tokens-surface);'),
    // an optional chain reads the same value, so it is rewritten the same way
    fixes(`color: v-bind('$themeTokens?.text');`, 'color: var(--tokens-text);'),
    fixes(`color: v-bind('themeTokens()?.primary');`, 'color: var(--tokens-primary);'),
    {
      // every prefix, and the `v_N` version key the theme emits as `vN`
      filename: 'Invalid.vue',
      code: sfc(
        "color: v-bind('$themePalette.grey.v_400'); border-color: v-bind('$themeBrand.primary.v_600');",
      ),
      output: sfc('color: var(--palette-grey-v400); border-color: var(--brand-primary-v600);'),
      errors: [withVariable, withVariable],
    },
    {
      // two in one declaration are rewritten in a single pass
      filename: 'Invalid.vue',
      code: sfc(
        "background: linear-gradient(v-bind('$themeTokens.surface'), v-bind('$themeTokens.fineLine'));",
      ),
      output: sfc('background: linear-gradient(var(--tokens-surface), var(--tokens-fineLine));'),
      errors: [withVariable, withVariable],
    },
    {
      // nested at any depth, which is where KTable had it, and in a plain CSS block
      filename: 'Invalid.vue',
      code: `<template><div class="a" /></template>
<style lang="scss" scoped>
  @mixin shadow($direction) {
    &::before { background: v-bind('$themeTokens.surface'); }
  }
</style>
<style>
  .b { color: v-bind("themeTokens().text"); }
</style>
`,
      output: `<template><div class="a" /></template>
<style lang="scss" scoped>
  @mixin shadow($direction) {
    &::before { background: var(--tokens-surface); }
  }
</style>
<style>
  .b { color: var(--tokens-text); }
</style>
`,
      errors: [withVariable, withVariable],
    },
    {
      // reported with no rewrite: a compound expression, a namespaced call that may
      // be any object's method, and a path the theme emits no variable for
      filename: 'Invalid.vue',
      code: sfc(
        'color: v-bind("isActive ? themeTokens().primary : \'red\'"); ' +
          "border-color: v-bind('myStuff.themePalette().red'); " +
          "outline-color: v-bind('$themeTokens.surfase');",
      ),
      output: null,
      errors: [themed, themed, themed],
    },
  ],
});
