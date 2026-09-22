/*
 * What the rule does when `kolibri-design-system` cannot be read. Left unhandled the
 * failure ends the whole stylelint run, so the rule turns it into one warning per file.
 */

import stylelint from 'stylelint';

// the names are asked for only once a themed custom property turns up, so this mock
// throws in exactly the place the rule would look them up
jest.mock('kolibri-css-variables', () => {
  const actual = jest.requireActual('kolibri-css-variables');
  return {
    ...actual,
    getThemeCssVariableNames: () => {
      const error = new Error('the design system is not installed');
      error.code = 'KOLIBRI_THEME_SOURCE_UNAVAILABLE';
      throw error;
    },
  };
});

const plugin = require('../rules/no-unknown-theme-custom-properties');

const { ruleName } = plugin.rule;

async function warningsFor(code, options = true) {
  const { results } = await stylelint.lint({
    code,
    codeFilename: 'test.scss',
    customSyntax: 'postcss-scss',
    config: { plugins: [plugin], rules: { [ruleName]: options } },
  });
  return results[0].warnings.filter(warning => warning.rule === ruleName);
}

describe('no-unknown-theme-custom-properties without a readable theme source', () => {
  it('warns once for a file that uses a theme custom property', async () => {
    const warnings = await warningsFor(`
      .a {
        color: var(--tokens-primary);
        background: var(--palette-grey-v400);
      }
    `);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].text).toContain('the design system is not installed');
  });

  it('says nothing about a file with no theme custom property', async () => {
    expect(await warningsFor('.a { color: var(--someLocalProperty); }')).toEqual([]);
  });

  it('says nothing when every theme name in the file is an ignored one', async () => {
    const warnings = await warningsFor('.a { color: var(--tokens-appDefined); }', [
      true,
      { ignoreProperties: ['--tokens-appDefined'] },
    ]);
    expect(warnings).toEqual([]);
  });
});
