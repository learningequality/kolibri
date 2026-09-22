import stylelint from 'stylelint';

import plugin from '../rules/no-unknown-theme-custom-properties';

const { ruleName, messages } = plugin.rule;

function lintScss(code, options = true) {
  return stylelint.lint({
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
  return stylelint.lint({
    code,
    codeFilename: 'Test.vue',
    customSyntax: 'postcss-html',
    config: {
      plugins: [plugin],
      rules: { [ruleName]: true },
    },
  });
}

async function fixedScss(code) {
  const { output } = await stylelint.lint({
    code,
    codeFilename: 'test.scss',
    customSyntax: 'postcss-scss',
    config: {
      plugins: [plugin],
      rules: { [ruleName]: true },
    },
    fix: true,
  });
  return output;
}

// filters to this rule's warnings, so an unrelated one cannot pass a test
async function warningsFor(result) {
  const { results } = await result;
  return results[0].warnings.filter(warning => warning.rule === ruleName);
}

describe('no-unknown-theme-custom-properties', () => {
  it('accepts valid theme custom properties', async () => {
    const warnings = await warningsFor(
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

  it('ignores a `var()` without a themed prefix', async () => {
    const warnings = await warningsFor(
      lintScss(`
        .a {
          color: var(--someLocalProperty);
          background: var(--kTableStickyColumnBackground);
        }
      `),
    );
    expect(warnings).toHaveLength(0);
  });

  it('reports a misspelled name, pointing at the name', async () => {
    const code = '.a { color: var(--tokens-focusOutine); }';
    const warnings = await warningsFor(lintScss(code));
    expect(warnings).toHaveLength(1);
    expect(warnings[0].text).toBe(messages.rejected('--tokens-focusOutine'));
    expect(code.slice(warnings[0].column - 1, warnings[0].endColumn - 1)).toBe(
      '--tokens-focusOutine',
    );
  });

  it('reports a misspelled name given a fallback, or nested in one', async () => {
    expect(
      await warningsFor(lintScss('.a { color: var(--tokens-focusOutine, #ff0000); }')),
    ).toHaveLength(1);
    expect(
      await warningsFor(
        lintScss('.a { color: var(--someLocalProperty, var(--tokens-focusOutine)); }'),
      ),
    ).toHaveLength(1);
  });

  it('reports a misspelled name passed to an at-rule, pointing at the name', async () => {
    const code = '.a { @include shadow(var(--tokens-surfase)); }';
    const warnings = await warningsFor(lintScss(code));
    expect(warnings).toHaveLength(1);
    expect(code.slice(warnings[0].column - 1, warnings[0].endColumn - 1)).toBe('--tokens-surfase');
  });

  it('reports a misspelled name inside a single file component style block', async () => {
    const warnings = await warningsFor(
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
    expect(warnings[0].text).toBe(messages.rejected('--tokens-surfase'));
  });

  it('suggests the emitted name for the source `v_N` version key form', async () => {
    const warnings = await warningsFor(lintScss('.a { color: var(--palette-grey-v_400); }'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0].text).toBe(messages.rejected('--palette-grey-v_400', '--palette-grey-v400'));
  });

  it('fixes the `v_N` form wherever it appears', async () => {
    expect(await fixedScss('.a { color: var(--palette-grey-v_400); }')).toBe(
      '.a { color: var(--palette-grey-v400); }',
    );
    expect(await fixedScss('.a { border-color: var(--brand-primary-v_600); }')).toBe(
      '.a { border-color: var(--brand-primary-v600); }',
    );
    expect(await fixedScss('.a { color: var(--tokens-primary, var(--palette-grey-v_400)); }')).toBe(
      '.a { color: var(--tokens-primary, var(--palette-grey-v400)); }',
    );
    expect(await fixedScss('.a { @include shadow(var(--palette-grey-v_400)); }')).toBe(
      '.a { @include shadow(var(--palette-grey-v400)); }',
    );
  });

  it('reports rather than rewrites a value that holds a comment', async () => {
    // postcss keeps the comment in `raws`, which rewriting the value would drop
    const code = '.a { color: var(--palette-grey-v_400) /* keep */; }';
    expect(await fixedScss(code)).toBe(code);
    expect(await warningsFor(lintScss(code))).toHaveLength(1);
  });

  it('leaves a name with no certain replacement alone, and still reports it', async () => {
    const code = '.a { color: var(--tokens-surfase); }';
    expect(await fixedScss(code)).toBe(code);
    expect(await warningsFor(lintScss(code))).toHaveLength(1);
  });

  it('accepts names `ignoreProperties` covers, and still reports the rest', async () => {
    // apps add their own tokens at runtime with `setTokenMapping()`
    const code = '.a { color: var(--tokens-appDefined); }';
    expect(
      await warningsFor(lintScss(code, [true, { ignoreProperties: ['--tokens-appDefined'] }])),
    ).toHaveLength(0);
    expect(
      await warningsFor(lintScss(code, [true, { ignoreProperties: [/^--tokens-app/] }])),
    ).toHaveLength(0);
    expect(
      await warningsFor(
        lintScss('.a { color: var(--tokens-surfase); }', [
          true,
          { ignoreProperties: ['--tokens-appDefined'] },
        ]),
      ),
    ).toHaveLength(1);
  });

  it('rejects an `ignoreProperties` entry that is not a string or regexp', async () => {
    const { results } = await lintScss('.a { color: var(--tokens-surfase); }', [
      true,
      { ignoreProperties: [42] },
    ]);
    expect(results[0].invalidOptionWarnings).toHaveLength(1);
    expect(results[0].errored).toBe(true);
  });
});
