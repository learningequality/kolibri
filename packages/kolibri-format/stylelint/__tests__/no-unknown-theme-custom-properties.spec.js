import { TIMEOUT, lintInChildProcess } from '../../__tests__/stylelintTestUtils';

jest.setTimeout(TIMEOUT);

const plugin = require.resolve('../rules/no-unknown-theme-custom-properties');

const ruleName = 'kolibri/no-unknown-theme-custom-properties';

function lintScss(code, options = true) {
  return lintInChildProcess({
    code,
    codeFilename: 'test.scss',
    customSyntax: 'postcss-scss',
    config: {
      plugins: [plugin],
      rules: { [ruleName]: options },
    },
  });
}

function lintVue(code) {
  return lintInChildProcess({
    code,
    codeFilename: 'Test.vue',
    customSyntax: 'postcss-html',
    config: {
      plugins: [plugin],
      rules: { [ruleName]: true },
    },
  });
}

function fixedScss(code) {
  const { code: fixed } = lintInChildProcess({
    code,
    codeFilename: 'test.scss',
    customSyntax: 'postcss-scss',
    config: {
      plugins: [plugin],
      rules: { [ruleName]: true },
    },
    fix: true,
  });
  return fixed;
}

// filters to this rule's warnings, so an unrelated one cannot pass a test
function warningsFor({ results }) {
  return results[0].warnings.filter(warning => warning.rule === ruleName);
}

describe('no-unknown-theme-custom-properties', () => {
  it('accepts valid theme custom properties', () => {
    const warnings = warningsFor(
      lintScss(`
        .a {
          color: var(--tokens-primary);
          border-color: var(--brand-primary-v600);
          background: var(--palette-grey-v400);
          outline-color: var(--palette-black);
        }
      `),
    );
    expect(warnings).toHaveLength(0);
  });

  it('ignores a `var()` without a themed prefix', () => {
    const warnings = warningsFor(
      lintScss(`
        .a {
          color: var(--someLocalProperty);
          background: var(--kTableStickyColumnBackground);
        }
      `),
    );
    expect(warnings).toHaveLength(0);
  });

  it('reports a misspelled name, pointing at the name', () => {
    const code = '.a { color: var(--tokens-focusOutine); }';
    const warnings = warningsFor(lintScss(code));
    expect(warnings).toHaveLength(1);
    expect(warnings[0].text).toBe(
      'Unexpected unknown theme custom property "--tokens-focusOutine" (kolibri/no-unknown-theme-custom-properties)',
    );
    expect(code.slice(warnings[0].column - 1, warnings[0].endColumn - 1)).toBe(
      '--tokens-focusOutine',
    );
  });

  it('reports a misspelled name given a fallback, or nested in one', () => {
    expect(warningsFor(lintScss('.a { color: var(--tokens-focusOutine, #ff0000); }'))).toHaveLength(
      1,
    );
    expect(
      warningsFor(lintScss('.a { color: var(--someLocalProperty, var(--tokens-focusOutine)); }')),
    ).toHaveLength(1);
  });

  it('reports a misspelled name passed to an at-rule, pointing at the name', () => {
    const code = '.a { @include shadow(var(--tokens-surfase)); }';
    const warnings = warningsFor(lintScss(code));
    expect(warnings).toHaveLength(1);
    expect(code.slice(warnings[0].column - 1, warnings[0].endColumn - 1)).toBe('--tokens-surfase');
  });

  it('reports a misspelled name inside a single file component style block', () => {
    const warnings = warningsFor(
      lintVue(`<template><div class="a" /></template>
        <style lang="scss" scoped>
          .a {
            color: var(--tokens-primary);
            background: var(--tokens-surfase);
          }
        </style>
      `),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].text).toBe(
      'Unexpected unknown theme custom property "--tokens-surfase" (kolibri/no-unknown-theme-custom-properties)',
    );
  });

  it('suggests the emitted name for the source `v_N` version key form', () => {
    const warnings = warningsFor(lintScss('.a { color: var(--palette-grey-v_400); }'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0].text).toBe(
      'Unexpected unknown theme custom property "--palette-grey-v_400", did you mean "--palette-grey-v400"? (kolibri/no-unknown-theme-custom-properties)',
    );
  });

  it('fixes the `v_N` form wherever it appears', () => {
    expect(fixedScss('.a { color: var(--palette-grey-v_400); }')).toBe(
      '.a { color: var(--palette-grey-v400); }',
    );
    expect(fixedScss('.a { border-color: var(--brand-primary-v_600); }')).toBe(
      '.a { border-color: var(--brand-primary-v600); }',
    );
    expect(fixedScss('.a { color: var(--tokens-primary, var(--palette-grey-v_400)); }')).toBe(
      '.a { color: var(--tokens-primary, var(--palette-grey-v400)); }',
    );
    expect(fixedScss('.a { @include shadow(var(--palette-grey-v_400)); }')).toBe(
      '.a { @include shadow(var(--palette-grey-v400)); }',
    );
  });

  it('reports rather than rewrites a value that holds a comment', () => {
    // postcss keeps the comment in `raws`, which rewriting the value would drop
    const code = '.a { color: var(--palette-grey-v_400) /* keep */; }';
    expect(fixedScss(code)).toBe(code);
    expect(warningsFor(lintScss(code))).toHaveLength(1);
  });

  it('leaves a name with no certain replacement alone, and still reports it', () => {
    const code = '.a { color: var(--tokens-surfase); }';
    expect(fixedScss(code)).toBe(code);
    expect(warningsFor(lintScss(code))).toHaveLength(1);
  });

  it('accepts names `ignoreProperties` covers, and still reports the rest', () => {
    // apps add their own tokens at runtime with `setTokenMapping()`
    const code = '.a { color: var(--tokens-appDefined); }';
    expect(
      warningsFor(lintScss(code, [true, { ignoreProperties: ['--tokens-appDefined'] }])),
    ).toHaveLength(0);
    expect(
      warningsFor(lintScss(code, [true, { ignoreProperties: [/^--tokens-app/] }])),
    ).toHaveLength(0);
    expect(
      warningsFor(
        lintScss('.a { color: var(--tokens-surfase); }', [
          true,
          { ignoreProperties: ['--tokens-appDefined'] },
        ]),
      ),
    ).toHaveLength(1);
  });

  it('rejects an `ignoreProperties` entry that is not a string or regexp', () => {
    const { results } = lintScss('.a { color: var(--tokens-surfase); }', [
      true,
      { ignoreProperties: [42] },
    ]);
    expect(results[0].invalidOptionWarnings).toHaveLength(1);
    expect(results[0].errored).toBe(true);
  });
});
