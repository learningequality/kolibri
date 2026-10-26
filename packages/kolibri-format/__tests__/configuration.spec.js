/*
 * The rule specs build their own configs, so they pass whether or not the rules are
 * switched on for consumers. These lint through `.stylelintrc.js` and
 * `eslint.config.mjs` themselves, so dropping a registration fails the suite.
 */

import path from 'node:path';

import { ROOT_DIR, TIMEOUT, lintInChildProcess, runInChildProcess } from './stylelintTestUtils';

jest.setTimeout(TIMEOUT);

const STYLELINT_CONFIG_FILE = path.join(ROOT_DIR, '.stylelintrc.js');

function lintThroughConfig(code, fix = false) {
  return lintInChildProcess({
    code,
    codeFilename: path.join(ROOT_DIR, 'smokeTest.scss'),
    customSyntax: 'postcss-scss',
    configFile: STYLELINT_CONFIG_FILE,
    fix,
  });
}

describe('.stylelintrc.js', () => {
  it('enables `kolibri/no-unknown-theme-custom-properties`', () => {
    const { results } = lintThroughConfig('.a { color: var(--tokens-surfase); }\n');
    const rules = results[0].warnings.map(warning => warning.rule);
    expect(rules).toContain('kolibri/no-unknown-theme-custom-properties');
  });

  it('fixes the source `v_N` version key form through it', () => {
    const { code } = lintThroughConfig('.a { color: var(--palette-grey-v_400); }\n', true);
    expect(code).toBe('.a { color: var(--palette-grey-v400); }\n');
  });

  describe('`v-bind()` in a `<style>` block', () => {
    const component = `<template>
  <div class="a"></div>
</template>

<style lang="scss" scoped>
  .a {
    color: v-bind(tint);
    background-color: v-bind(deleteHoverColor);
    border-color: v-bind('deleteHoverColor');
  }
</style>
`;

    function lintComponent(fix = false) {
      return lintInChildProcess({
        code: component,
        codeFilename: path.join(ROOT_DIR, 'SmokeTest.vue'),
        configFile: STYLELINT_CONFIG_FILE,
        fix,
      });
    }

    it('keeps the case of the bound name when fixing', () => {
      const { code } = lintComponent(true);
      expect(code).toBe(component);
    });

    it('reports no error', () => {
      const { results } = lintComponent();
      expect(results[0].warnings).toEqual([]);
    });
  });

  it('accepts a valid camelCase token name', () => {
    // `custom-property-pattern` from `stylelint-config-standard` checks `var()` usage as
    // well as declarations, so its kebab-case default reports every valid token name
    const { results } = lintThroughConfig('.a { color: var(--tokens-textDisabled); }\n');
    expect(results[0].warnings).toEqual([]);
  });

  it('reports a duplicate selector', () => {
    const { results } = lintThroughConfig('.a { top: 0; }\n\n.a { left: 0; }\n');
    const rules = results[0].warnings.map(warning => warning.rule);
    expect(rules).toContain('no-duplicate-selectors');
  });
});

describe('eslint.config.mjs', () => {
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
    return runInChildProcess(script);
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

  it('enables the two theming rules for `<style>` blocks as errors', () => {
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
  });

  it('enforces `kolibri/vue-no-theme-accessor-in-inline-styles`', () => {
    expect(configuredRule('kolibri/vue-no-theme-accessor-in-inline-styles')).toEqual([ERROR]);
  });
});
