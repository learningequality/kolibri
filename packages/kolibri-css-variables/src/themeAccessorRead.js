/*
 * Reading a theme value out of a JS expression, e.g. `this.$themeTokens.text`. Both
 * ESLint theming rules use this, so a fix to one is a fix to both.
 */

const { THEME_ACCESSOR_PREFIXES, themeCssVariableName } = require('./themeCssVariableNaming');
const { getThemeCssVariableNames } = require('./themeCssVariableNames');

function accessorName(node) {
  if (node.type === 'Identifier' && node.name.startsWith('$')) {
    return node.name.slice(1);
  }
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'ThisExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name.startsWith('$')
  ) {
    return node.property.name.slice(1);
  }
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    return node.callee.name;
  }
  return null;
}

/**
 * The CSS variable prefix `node` is the theme accessor for, or `null`. A namespaced call
 * is left out: `other.themeTokens()` may be any object's method.
 * @param {object} node - The AST node to test.
 * @returns {string|null}
 */
function accessorPrefix(node) {
  const name = accessorName(node);
  // own names only. An inherited one such as `constructor` would resolve to a function
  return name && Object.hasOwn(THEME_ACCESSOR_PREFIXES, name)
    ? THEME_ACCESSOR_PREFIXES[name]
    : null;
}

/**
 * How the accessor was written, for a report to quote back.
 * @param {object} node - The theme accessor the read is rooted at.
 * @returns {string}
 */
function accessorText(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression') {
    return `this.${node.property.name}`;
  }
  return `${node.callee.name}()`;
}

/**
 * The theme value `node` reads, or `null` when it is not a plain path of property
 * accesses off a theme accessor. `variable` is `null` for a path the theme emits nothing
 * for, which is a misspelling rather than a value to rewrite.
 * @param {object} node - The AST node to test.
 * @returns {{reference: string, variable: string|null}|null}
 * @throws {Error} When the design system's color and token files cannot be loaded.
 */
function themeRead(node) {
  const segments = [];
  // `$themeTokens?.text` parses as a chain wrapping the member access, so unwrap it
  let current = node.type === 'ChainExpression' ? node.expression : node;
  // stops at the accessor itself, so `this.$themeTokens` is a root, not a segment
  while (
    current.type === 'MemberExpression' &&
    !current.computed &&
    current.property.type === 'Identifier' &&
    !accessorPrefix(current)
  ) {
    segments.unshift(current.property.name);
    current = current.object;
  }
  const prefix = accessorPrefix(current);
  if (!prefix || !segments.length) {
    return null;
  }
  const name = themeCssVariableName(prefix, segments);
  return {
    reference: `${accessorText(current)}.${segments.join('.')}`,
    variable: getThemeCssVariableNames().has(name) ? `var(${name})` : null,
  };
}

module.exports = {
  themeRead,
};
