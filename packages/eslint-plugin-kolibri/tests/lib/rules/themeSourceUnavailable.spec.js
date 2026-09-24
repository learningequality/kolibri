/*
 * What the two theming rules do when `kolibri-design-system` cannot be read. Left
 * unhandled the failure escapes `Linter.verify` and ends the whole run, taking every
 * other rule with it, so each rule turns it into one report for the file.
 */

const { Linter } = require('eslint');
const vueParser = require('vue-eslint-parser');

// `themeRead` reaches the theme's names only once a node is a theme accessor path, so
// this mock throws in exactly the place the real one would look them up.
jest.mock('kolibri-css-variables', () => {
  const actual = jest.requireActual('kolibri-css-variables');
  return {
    ...actual,
    themeRead: node => {
      if (!actual.themeRead(node)) {
        return null;
      }
      const error = new Error('the design system is not installed');
      error.code = 'KOLIBRI_THEME_SOURCE_UNAVAILABLE';
      throw error;
    },
  };
});

const inlineStyles = require('../../../lib/rules/vue-no-theme-accessor-in-inline-styles');
const vBind = require('../../../lib/rules/vue-no-theme-tokens-in-v-bind');

function lint(rule, code, filename) {
  return new Linter().verify(
    code,
    [
      {
        files: ['**/*.vue'],
        plugins: { kolibri: { rules: { subject: rule } } },
        languageOptions: { parser: vueParser, ecmaVersion: 'latest', sourceType: 'module' },
        rules: { 'kolibri/subject': 'error' },
      },
    ],
    filename,
  );
}

describe('vue-no-theme-accessor-in-inline-styles without a readable theme source', () => {
  it('reports once for a component that reads the theme', () => {
    const messages = lint(
      inlineStyles,
      `<template>
  <div :style="{ color: $themeTokens.text, backgroundColor: $themeTokens.surface }" />
</template>
`,
      'Reads.vue',
    );
    expect(messages.map(message => message.messageId)).toEqual(['themeSourceUnavailable']);
    expect(messages[0].message).toContain('the design system is not installed');
  });

  it('reports once across the template and the script block', () => {
    const messages = lint(
      inlineStyles,
      `<template>
  <div :style="{ color: $themeTokens.text }" />
</template>
<script>
export default {
  computed: {
    cardStyle() {
      return { backgroundColor: this.$themeTokens.surface };
    },
  },
};
</script>
`,
      'Both.vue',
    );
    expect(messages).toHaveLength(1);
  });

  it('says nothing about a component that reads no theme value', () => {
    const messages = lint(
      inlineStyles,
      `<template><div :style="{ color: ownColor }" /></template>\n`,
      'Quiet.vue',
    );
    expect(messages).toEqual([]);
  });
});

describe('vue-no-theme-tokens-in-v-bind without a readable theme source', () => {
  function sfc(declarations) {
    return `<template><div class="a" /></template>
<style lang="scss" scoped>
  .a { ${declarations} }
</style>
`;
  }

  it('reports once for a style block that reads the theme', () => {
    const messages = lint(
      vBind,
      sfc("color: v-bind('$themeTokens.text'); background: v-bind('$themeTokens.surface');"),
      'Reads.vue',
    );
    expect(messages.map(message => message.messageId)).toEqual(['themeSourceUnavailable']);
    expect(messages[0].message).toContain('the design system is not installed');
  });

  it('says nothing about a style block that reads no theme value', () => {
    const messages = lint(vBind, sfc('color: v-bind(ownColor);'), 'Quiet.vue');
    expect(messages).toEqual([]);
  });
});
