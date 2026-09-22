/*
 * Reports a `var()` referencing a theme custom property that does not exist,
 * for example the misspelled `var(--tokens-focusOutine)`.
 *
 * Only `--tokens-`, `--brand-`, and `--palette-` names are checked. A component defines
 * its own custom properties and this rule cannot know them. An app can also add theme
 * values at runtime with `setTokenMapping()` and `setBrandColors()`, which are not in
 * the design system source. List those with the `ignoreProperties` option:
 *
 *   'kolibri/no-unknown-theme-custom-properties': [true, { ignoreProperties: [/^--tokens-app/] }]
 *
 * It is a stylelint rule and not an ESLint one so that it covers both `<style>` blocks
 * and standalone `.scss` files.
 */

const stylelint = require('stylelint');
const valueParser = require('postcss-value-parser');

const {
  getThemeCssVariableNames,
  isThemeSourceError,
  isThemedCustomProperty,
  suggestThemeCssVariableName,
} = require('kolibri-css-variables');

const ruleName = 'kolibri/no-unknown-theme-custom-properties';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (name, suggestion) =>
    `Unexpected unknown theme custom property "${name}"` +
    (suggestion ? `, did you mean "${suggestion}"?` : ''),
  themeSourceUnavailable: reason => `This rule cannot check theme names. ${reason}`,
});

// an `ignoreProperties` entry is either an exact name or a regular expression
function isIgnored(name, ignoreProperties) {
  if (!ignoreProperties) {
    return false;
  }
  return [ignoreProperties].flat().some(entry => {
    if (entry instanceof RegExp) {
      return entry.test(name);
    }
    return entry === name;
  });
}

/**
 * Index of a declaration's value within the declaration's own source, so a report
 * can point at the offending name rather than the whole declaration.
 * @param {object} decl - The postcss declaration being reported on.
 * @returns {number}
 */
function declarationValueIndex(decl) {
  const raws = decl.raws;
  const between = (raws.between !== undefined ? raws.between : ':').length;
  const prefix = (raws.prop && raws.prop.prefix ? raws.prop.prefix : '').length;
  return decl.prop.length + prefix + between;
}

/**
 * The same, for an at-rule's params, which follow `@`, the name, and any space.
 * @param {object} atRule - The postcss at-rule being reported on.
 * @returns {number}
 */
function atRuleParamsIndex(atRule) {
  const afterName = atRule.raws.afterName !== undefined ? atRule.raws.afterName : ' ';
  return 1 + atRule.name.length + afterName.length;
}

const meta = {
  fixable: true,
};

const rule = (primary, secondary, context) => {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(
      result,
      ruleName,
      {
        actual: primary,
        possible: [true],
      },
      {
        actual: secondary,
        optional: true,
        possible: {
          ignoreProperties: [value => typeof value === 'string' || value instanceof RegExp],
        },
      },
    );
    if (!validOptions) {
      return;
    }

    const ignoreProperties = secondary && secondary.ignoreProperties;

    let validNames = null;
    let sourceErrorReported = false;

    /**
     * The valid names, or `null` once the theme source has been reported as unreadable.
     * Called only after a themed custom property turns up, so a file with none is left
     * alone.
     * @param {object} node - The node the report points at.
     * @returns {Set<string>|null}
     * @throws {Error} When the lookup fails for any other reason.
     */
    const themeNames = node => {
      if (validNames || sourceErrorReported) {
        return validNames;
      }
      try {
        validNames = getThemeCssVariableNames();
      } catch (error) {
        if (!isThemeSourceError(error)) {
          throw error;
        }
        stylelint.utils.report({
          result,
          ruleName,
          message: messages.themeSourceUnavailable,
          messageArgs: [error.message],
          node,
        });
        sourceErrorReported = true;
      }
      return validNames;
    };

    const handleUnknownNames = (node, property, valueIndex) => {
      const parsed = valueParser(node[property]);
      // postcss keeps a comment written inside a value in `raws`, which rewriting the
      // value would drop, so such a declaration is reported and left to be fixed by hand
      const canFix = context.fix && !node.raws[property];
      let rewritten = false;
      parsed.walk(valueNode => {
        if (valueNode.type !== 'function' || valueNode.value.toLowerCase() !== 'var') {
          return;
        }
        const [nameNode] = valueNode.nodes;
        if (!nameNode) {
          return;
        }
        const name = nameNode.value;
        if (!isThemedCustomProperty(name)) {
          return;
        }
        // names an app added at runtime with `setTokenMapping()`/`setBrandColors()`.
        // Checked before the lookup, so a file whose only theme names are these is not
        // told about a design system it does not need.
        if (isIgnored(name, ignoreProperties)) {
          return;
        }
        const names = themeNames(node);
        if (!names || names.has(name)) {
          return;
        }
        const suggestion = suggestThemeCssVariableName(name);
        // only the source `v_N` version key form has a certain replacement
        if (canFix && suggestion) {
          nameNode.value = suggestion;
          rewritten = true;
          return;
        }
        stylelint.utils.report({
          result,
          ruleName,
          message: messages.rejected,
          messageArgs: [name, suggestion],
          node,
          index: valueIndex + nameNode.sourceIndex,
          endIndex: valueIndex + nameNode.sourceEndIndex,
        });
      });
      if (rewritten) {
        node[property] = parsed.toString();
      }
    };

    root.walkDecls(decl => handleUnknownNames(decl, 'value', declarationValueIndex(decl)));
    // a `var()` passed to an at-rule, e.g. `@include shadow(var(--tokens-surface))`
    root.walkAtRules(atRule => handleUnknownNames(atRule, 'params', atRuleParamsIndex(atRule)));
  };
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = stylelint.createPlugin(ruleName, rule);
