const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-theme-accessor-in-inline-styles');
const { vueLanguageOptions } = require('../../helpers');

const ruleTester = new RuleTester({
  languageOptions: vueLanguageOptions,
});

function template(t) {
  return `<template>${t}</template>\n`;
}

function script(s) {
  return `<template><div /></template>\n<script>\n${s}\n</script>\n`;
}

const known = { messageId: 'staticThemeValue' };
const unknown = { messageId: 'staticThemeValueUnknown' };

ruleTester.run('vue-no-theme-accessor-in-inline-styles', rule, {
  valid: [
    {
      // the migration target
      filename: 'Valid.vue',
      code: template('<div class="a" />'),
    },
    {
      // the fix the message asks for: the variable resolves in an inline style
      filename: 'Valid.vue',
      code: template(`<div :style="{ color: 'var(--tokens-text)' }" />`),
    },
    {
      // the same fix for a conditional, which needs no class toggle
      filename: 'Valid.vue',
      code: template(
        `<div :style="{ color: c ? 'var(--tokens-primary)' : 'var(--tokens-text)' }" />`,
      ),
    },
    {
      // combined in a template literal, which no single `var()` replaces
      filename: 'Valid.vue',
      code: template('<div :style="{ borderBottom: `1px solid ${$themeTokens.fineLine}` }" />'),
    },
    {
      // combined by concatenation
      filename: 'Valid.vue',
      code: template(`<div :style="{ borderBottom: '1px solid ' + $themeTokens.fineLine }" />`),
    },
    {
      // transformed by a utility, which is what a JS accessor is still for
      filename: 'Valid.vue',
      code: template('<div :style="{ color: darken($themeTokens.primary, 0.2) }" />'),
    },
    {
      filename: 'Valid.vue',
      code: template('<div :style="{ backgroundColor: rgba($themeTokens.surface, 0.5) }" />'),
    },
    {
      // a component prop is not an inline style
      filename: 'Valid.vue',
      code: template('<KIcon :color="$themeTokens.annotation" />'),
    },
    {
      // an object passed as some other prop is not an inline style either
      filename: 'Valid.vue',
      code: template('<KPage :appearanceOverrides="{ backgroundColor: $themeTokens.surface }" />'),
    },
    {
      // a returned object with no CSS property keys is not a style object
      filename: 'Valid.vue',
      code: script(`export default {
  computed: {
    palette() {
      return { brandColor: this.$themeTokens.primary };
    },
  },
};`),
    },
    {
      // a namespaced call may be any object's method
      filename: 'Valid.vue',
      code: template('<div :style="{ color: other.themeTokens().primary }" />'),
    },
    {
      // a call that only shares a name with something on `Object.prototype`
      filename: 'Valid.vue',
      code: template('<div :style="{ color: constructor().text }" />'),
    },
    {
      // the helper may darken or blend the value, which a `var()` string cannot be
      filename: 'Valid.vue',
      code: template('<div :style="makeStyle({ backgroundColor: $themeTokens.surface })" />'),
    },
    {
      // a destructuring pattern reads the object rather than holding a style object
      filename: 'Valid.vue',
      code: script('const { color } = { color: $themeTokens.text };'),
    },
  ],
  invalid: [
    {
      filename: 'Invalid.vue',
      code: template('<div :style="{ color: $themeTokens.text }" />'),
      output: template(`<div :style="{ color: 'var(--tokens-text)' }" />`),
      errors: [known],
    },
    {
      // an optional chain reads the same value, and the chain is replaced along with it
      filename: 'Invalid.vue',
      code: template('<div :style="{ color: $themeTokens?.text }" />'),
      output: template(`<div :style="{ color: 'var(--tokens-text)' }" />`),
      errors: [known],
    },
    {
      // the same through `this` and through the call form
      filename: 'Invalid.vue',
      code: template(
        '<div :style="{ color: this.$themeTokens?.text, fill: themeTokens()?.surface }" />',
      ),
      output: template(
        `<div :style="{ color: 'var(--tokens-text)', fill: 'var(--tokens-surface)' }" />`,
      ),
      errors: [known, known],
    },
    {
      // an optional chain to nowhere is still counted, still not rewritten
      filename: 'Invalid.vue',
      code: template('<div :style="{ color: $themeTokens?.surfase }" />'),
      output: null,
      errors: [unknown],
    },
    {
      // a single-quoted attribute cannot hold a single-quoted string
      filename: 'Invalid.vue',
      code: template(`<div :style='{ color: $themeTokens.text }' />`),
      output: template(`<div :style='{ color: "var(--tokens-text)" }' />`),
      errors: [known],
    },
    {
      // every accessor, and the `v_N` version key the theme emits as `vN`
      filename: 'Invalid.vue',
      code: template(
        '<div :style="{ color: $themePalette.grey.v_400, borderColor: $themeBrand.primary.v_600 }" />',
      ),
      output: template(
        `<div :style="{ color: 'var(--palette-grey-v400)', borderColor: 'var(--brand-primary-v600)' }" />`,
      ),
      errors: [known, known],
    },
    {
      // a ternary is reported on each branch
      filename: 'Invalid.vue',
      code: template(
        '<div :style="{ color: isActive ? $themeTokens.primary : $themeTokens.text }" />',
      ),
      output: template(
        `<div :style="{ color: isActive ? 'var(--tokens-primary)' : 'var(--tokens-text)' }" />`,
      ),
      errors: [known, known],
    },
    {
      // the array form of `:style`
      filename: 'Invalid.vue',
      code: template('<div :style="[base, { color: $themeTokens.text }]" />'),
      output: template(`<div :style="[base, { color: 'var(--tokens-text)' }]" />`),
      errors: [known],
    },
    {
      // the binding still resolves to a style object through a conditional
      filename: 'Invalid.vue',
      code: template('<div :style="show ? { color: $themeTokens.text } : null" />'),
      output: template(`<div :style="show ? { color: 'var(--tokens-text)' } : null" />`),
      errors: [known],
    },
    {
      // and through the guard form, where the object is the right operand
      filename: 'Invalid.vue',
      code: template('<div :style="show && { color: $themeTokens.text }" />'),
      output: template(`<div :style="show && { color: 'var(--tokens-text)' }" />`),
      errors: [known],
    },
    {
      // a path the theme emits no variable for still counts, without naming a replacement
      filename: 'Invalid.vue',
      code: template('<div :style="{ color: $themeTokens.surfase }" />'),
      // no variable resolves, so there is nothing certain to rewrite
      output: null,
      errors: [unknown],
    },
    {
      // an options API computed returning a style object
      filename: 'Invalid.vue',
      code: script(`export default {
  computed: {
    cardStyle() {
      return {
        backgroundColor: this.$themeTokens.surface,
        marginBottom: \`\${this.gutter}px\`,
      };
    },
  },
};`),
      output: script(`export default {
  computed: {
    cardStyle() {
      return {
        backgroundColor: 'var(--tokens-surface)',
        marginBottom: \`\${this.gutter}px\`,
      };
    },
  },
};`),
      errors: [known],
    },
    {
      // a style object held in a variable, the shape a component binds with `:style`
      filename: 'Invalid.vue',
      code: script(`export default {
  setup() {
    const keypadStyle = { background: themeTokens().surface };
    return { keypadStyle };
  },
};`),
      output: script(`export default {
  setup() {
    const keypadStyle = { background: 'var(--tokens-surface)' };
    return { keypadStyle };
  },
};`),
      errors: [known],
    },
    {
      // a lookup table keyed by a mix of CSS and other names: only the CSS-named keys
      // are rewritten, because only those are likely to be read as a CSS value
      filename: 'Invalid.vue',
      code: script(`export default {
  computed: {
    defaultTheme() {
      return {
        appBarColor: this.$themeTokens.primary,
        backgroundColor: this.$themeTokens.surface,
      };
    },
  },
};`),
      output: script(`export default {
  computed: {
    defaultTheme() {
      return {
        appBarColor: this.$themeTokens.primary,
        backgroundColor: 'var(--tokens-surface)',
      };
    },
  },
};`),
      errors: [known],
    },
    {
      // whitespace around the attribute's `=` does not change which quote is free
      filename: 'Invalid.vue',
      code: template(`<div :style = '{ color: $themeTokens.text }' />`),
      output: template(`<div :style = '{ color: "var(--tokens-text)" }' />`),
      errors: [known],
    },
    {
      // a composition API computed returning a style object
      filename: 'Invalid.vue',
      code: script(`import { computed } from 'vue';
import { themeTokens } from 'kolibri-design-system/lib/styles/theme';

export default {
  setup() {
    const cardStyle = computed(() => ({ color: themeTokens().text }));
    return { cardStyle };
  },
};`),
      output: script(`import { computed } from 'vue';
import { themeTokens } from 'kolibri-design-system/lib/styles/theme';

export default {
  setup() {
    const cardStyle = computed(() => ({ color: 'var(--tokens-text)' }));
    return { cardStyle };
  },
};`),
      errors: [known],
    },
  ],
});

// A plain `.js` file may hold a chart configuration, where a key such as `fill` names a
// CSS property but a `var()` string resolves to nothing.
const plainScriptRuleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

plainScriptRuleTester.run('vue-no-theme-accessor-in-inline-styles outside a component', rule, {
  valid: [
    {
      filename: 'chartOptions.js',
      code: `export const options = { fill: themeTokens().primary };`,
    },
    {
      filename: 'chartOptions.js',
      code: `export function options() {
  return { backgroundColor: themeTokens().surface };
}`,
    },
  ],
  invalid: [],
});

// A project may point `vue-eslint-parser` at every file, not at components alone.
const vueParserOnJsRuleTester = new RuleTester({
  languageOptions: vueLanguageOptions,
});

vueParserOnJsRuleTester.run('vue-no-theme-accessor-in-inline-styles on a .js file', rule, {
  valid: [
    {
      filename: 'chartOptions.js',
      code: `export const options = { fill: themeTokens().primary };`,
    },
  ],
  invalid: [],
});
