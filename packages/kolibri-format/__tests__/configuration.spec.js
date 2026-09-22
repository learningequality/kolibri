/*
 * The rule specs build their own configs, so they pass whether or not the rules are
 * switched on for consumers. These lint through `.stylelintrc.js` and
 * `eslint.config.mjs` themselves, so dropping a registration fails the suite.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

import stylelint from 'stylelint';

import stylelintConfig from '../.stylelintrc';

// the configs `.stylelintrc.js` extends resolve from here, not from the repository root
const ROOT_DIR = path.resolve(__dirname, '..');

function lintThroughConfig(code, fix = false) {
  return stylelint.lint({
    code,
    codeFilename: path.join(ROOT_DIR, 'smokeTest.scss'),
    customSyntax: 'postcss-scss',
    config: stylelintConfig,
    configBasedir: ROOT_DIR,
    fix,
  });
}

describe('.stylelintrc.js', () => {
  it('enables `kolibri/no-unknown-theme-custom-properties`', async () => {
    const { results } = await lintThroughConfig('.a { color: var(--tokens-surfase); }');
    const rules = results[0].warnings.map(warning => warning.rule);
    expect(rules).toContain('kolibri/no-unknown-theme-custom-properties');
  });

  it('fixes the source `v_N` version key form through it', async () => {
    const { output } = await lintThroughConfig('.a { color: var(--palette-grey-v_400); }', true);
    expect(output).toBe('.a { color: var(--palette-grey-v400); }');
  });

  it('accepts a valid camelCase token name', async () => {
    // `custom-property-pattern` from `stylelint-config-standard` checks `var()` usage as
    // well as declarations, so its kebab-case default reports every valid token name
    const { results } = await lintThroughConfig('.a { color: var(--tokens-textDisabled); }');
    expect(results[0].warnings).toEqual([]);
  });
});

describe('eslint.config.mjs', () => {
  const OFF = 0;
  const ERROR = 2;
  const CONFIG_FILE = path.join(ROOT_DIR, 'eslint.config.mjs');
  const FILE_PATH = path.join(ROOT_DIR, 'SmokeTest.vue');

  /*
   * ESLint loads a flat config with a dynamic import, which Jest cannot do without
   * `--experimental-vm-modules`, so both helpers run it in a child process.
   */
  function inChildProcess(body) {
    const script = `
      import { ESLint } from 'eslint';
      const linter = new ESLint({ overrideConfigFile: ${JSON.stringify(CONFIG_FILE)} });
      const filePath = ${JSON.stringify(FILE_PATH)};
      ${body}
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });
    return JSON.parse(output.trim().split('\n').pop());
  }

  function ruleSeveritiesFor(code) {
    return inChildProcess(`
      const results = await linter.lintText(${JSON.stringify(code)}, { filePath });
      console.log(
        JSON.stringify(results[0].messages.map(message => [message.ruleId, message.severity])),
      );
    `);
  }

  // the resolved entry, e.g. `[2]`, or `null` when the config sets the rule nowhere
  function configuredRule(ruleId) {
    return inChildProcess(`
      const config = await linter.calculateConfigForFile(filePath);
      console.log(JSON.stringify(config.rules[${JSON.stringify(ruleId)}] ?? null));
    `);
  }

  // spawning node and loading the flat config can outrun Jest's 5s default
  const TIMEOUT = 30000;

  it(
    'enables the two theming rules for `<style>` blocks as errors',
    () => {
      const severities = ruleSeveritiesFor(`<template>
  <div
    v-if="show"
    class="a"
  >
    {{ show }}
  </div>
</template>

<style lang="scss" scoped>
  .a {
    color: v-bind('themeTokens().primary');
  }
</style>
`);
      // the severity matters: `kolibri-format` gates on the error count, so a
      // warning would leave linting green with neither rule enforced
      expect(severities).toContainEqual(['kolibri/vue-no-theme-tokens-in-v-bind', ERROR]);
      expect(severities).toContainEqual(['kolibri/vue-no-root-v-if-with-style-v-bind', ERROR]);
    },
    TIMEOUT,
  );

  it(
    'leaves `kolibri/vue-no-theme-accessor-in-inline-styles` off',
    () => {
      // the rule carries a fixer and `kolibri-format` runs ESLint with `fix: true`, so
      // turning it on rewrites every existing call site in one pass
      expect(configuredRule('kolibri/vue-no-theme-accessor-in-inline-styles')).toEqual([OFF]);
    },
    TIMEOUT,
  );
});
