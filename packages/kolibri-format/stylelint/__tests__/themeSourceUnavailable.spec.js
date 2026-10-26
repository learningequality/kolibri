/*
 * What the rule does when `kolibri-design-system` cannot be read. Left unhandled the
 * failure ends the whole stylelint run, so the rule turns it into one warning per file.
 */

import { TIMEOUT, lintInChildProcess } from '../../__tests__/stylelintTestUtils';

jest.setTimeout(TIMEOUT);

const THROWING_THEME_SOURCE = `
  import { createRequire } from 'node:module';
  const cssVariables = createRequire(process.cwd() + '/')('kolibri-css-variables');
  cssVariables.getThemeCssVariableNames = () => {
    const error = new Error('the design system is not installed');
    error.code = 'KOLIBRI_THEME_SOURCE_UNAVAILABLE';
    throw error;
  };
`;

const plugin = require.resolve('../rules/no-unknown-theme-custom-properties');

const ruleName = 'kolibri/no-unknown-theme-custom-properties';

function warningsFor(code, options = true) {
  const { results } = lintInChildProcess(
    {
      code,
      codeFilename: 'test.scss',
      customSyntax: 'postcss-scss',
      config: { plugins: [plugin], rules: { [ruleName]: options } },
    },
    THROWING_THEME_SOURCE,
  );
  return results[0].warnings.filter(warning => warning.rule === ruleName);
}

describe('no-unknown-theme-custom-properties without a readable theme source', () => {
  it('warns once for a file that uses a theme custom property', () => {
    const warnings = warningsFor(`
      .a {
        color: var(--tokens-primary);
        background: var(--palette-grey-v400);
      }
    `);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].text).toContain('the design system is not installed');
  });

  it('says nothing about a file with no theme custom property', () => {
    expect(warningsFor('.a { color: var(--someLocalProperty); }')).toEqual([]);
  });

  it('says nothing when every theme name in the file is an ignored one', () => {
    const warnings = warningsFor('.a { color: var(--tokens-appDefined); }', [
      true,
      { ignoreProperties: ['--tokens-appDefined'] },
    ]);
    expect(warnings).toEqual([]);
  });
});
