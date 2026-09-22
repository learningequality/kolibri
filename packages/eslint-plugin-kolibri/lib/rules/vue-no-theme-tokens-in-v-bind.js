/*
 * Reports a theme value read inside a `v-bind()` in a `<style>` block. A read that
 * resolves to a theme CSS variable is fixed to it; any other read is only reported.
 */

const { THEME_ACCESSOR_PREFIXES, isThemeSourceError, themeRead } = require('kolibri-css-variables');

const THEME_FUNCTIONS = Object.keys(THEME_ACCESSOR_PREFIXES);

const THEME_PROPERTIES = THEME_FUNCTIONS.map(name => `$${name}`);

// walks every node, skipping the `parent` back-references that would cycle
function walk(node, visit, parent = null) {
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, visit, parent);
    }
    return;
  }
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') {
    return;
  }
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key !== 'parent') {
      walk(node[key], visit, node);
    }
  }
}

/**
 * Whether `node` is the property name in an access like `styles.$themeTokens`,
 * which is not the theme property. `this.$themeTokens` is the exception.
 * @param {object} node - The AST node to test.
 * @param {object|null} parent - The node `node` was reached from.
 * @returns {boolean}
 */
function isPropertyName(node, parent) {
  return Boolean(
    parent &&
    parent.type === 'MemberExpression' &&
    !parent.computed &&
    parent.property === node &&
    parent.object.type !== 'ThisExpression',
  );
}

function themeReferenceName(node) {
  if (node.type === 'Identifier' && THEME_PROPERTIES.includes(node.name)) {
    return node.name;
  }
  if (node.type !== 'CallExpression') {
    return null;
  }
  const callee = node.callee;
  if (callee.type === 'Identifier' && THEME_FUNCTIONS.includes(callee.name)) {
    return `${callee.name}()`;
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    THEME_FUNCTIONS.includes(callee.property.name)
  ) {
    return `${callee.property.name}()`;
  }
  return null;
}

function findThemeReference(node) {
  let found = null;
  walk(node, (current, parent) => {
    if (!found && !isPropertyName(current, parent)) {
      found = themeReferenceName(current);
    }
  });
  return found;
}

function getStyleVBinds(sourceCode) {
  const parserServices = sourceCode.parserServices || {};
  const documentFragment =
    parserServices.getDocumentFragment && parserServices.getDocumentFragment();
  if (!documentFragment) {
    return [];
  }
  const vBinds = [];
  for (const child of documentFragment.children) {
    if (child.type !== 'VElement' || child.name !== 'style') {
      continue;
    }
    for (const node of child.children) {
      if (node.type === 'VExpressionContainer' && node.expression) {
        vBinds.push(node);
      }
    }
  }
  return vBinds;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow theme values inside `v-bind()` in a `<style>` block',
    },
    fixable: 'code',
    schema: [],
    messages: {
      unexpectedTheme:
        'Unexpected `{{reference}}` inside `v-bind()`. Use a theme CSS variable instead, ' +
        'e.g. `var(--tokens-primary)`.',
      unexpectedThemeWithVariable:
        'Unexpected `{{reference}}` inside `v-bind()`. Use `{{variable}}` instead.',
      themeSourceUnavailable: 'This rule cannot check `v-bind()`. {{reason}}',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    return {
      Program(program) {
        for (const vBind of getStyleVBinds(sourceCode)) {
          const reference = findThemeReference(vBind.expression);
          if (!reference) {
            continue;
          }
          let variable;
          try {
            // the first point that needs the theme's names, so a file with no theme
            // `v-bind()` never asks for them
            variable = themeRead(vBind.expression)?.variable;
          } catch (error) {
            if (!isThemeSourceError(error)) {
              throw error;
            }
            context.report({
              node: program,
              messageId: 'themeSourceUnavailable',
              data: { reason: error.message },
            });
            return;
          }
          if (variable) {
            context.report({
              node: vBind.expression,
              messageId: 'unexpectedThemeWithVariable',
              data: { reference, variable },
              // the whole `v-bind()` is replaced, so the container is the range
              fix: fixer => fixer.replaceTextRange(vBind.range, variable),
            });
            continue;
          }
          context.report({
            node: vBind.expression,
            messageId: 'unexpectedTheme',
            data: { reference },
          });
        }
      },
    };
  },
};
