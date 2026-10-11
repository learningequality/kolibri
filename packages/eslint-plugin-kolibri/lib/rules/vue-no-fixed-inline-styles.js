/**
 * @file Disallow fixed inline styles in Vue templates.
 * @author Learning Equality
 */

const utils = require('eslint-plugin-vue/lib/utils');

/**
 * @typedef {import('vue-eslint-parser').AST.VAttribute} VAttribute
 * @typedef {import('vue-eslint-parser').AST.VExpressionContainer} VExpressionContainer
 */

/**
 * Check if a node represents a static (literal) value.
 * @param {object} node - AST node to check.
 * @returns {boolean} True if the node is a static literal value.
 */
function isStaticValue(node) {
  if (!node) {
    return false;
  }

  // Literal strings and numbers
  if (node.type === 'Literal' && (typeof node.value === 'string' || typeof node.value === 'number')) {
    return true;
  }

  // Template literals without placeholders (no expressions)
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return true;
  }

  return false;
}

/**
 * Check if a node represents a dynamic value.
 * @param {object} node - AST node to check.
 * @returns {boolean} True if the node is dynamic.
 */
function isDynamicValue(node) {
  if (!node) {
    return false;
  }

  // Template literals with placeholders
  if (node.type === 'TemplateLiteral' && node.expressions.length > 0) {
    return true;
  }

  // Identifiers, MemberExpressions, CallExpressions, etc. are dynamic
  if (
    node.type === 'Identifier' ||
    node.type === 'MemberExpression' ||
    node.type === 'CallExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ObjectExpression' || // Object expressions may contain dynamic values
    node.type === 'ArrayExpression' || // Array expressions may contain dynamic values
    node.type === 'ConditionalExpression' ||
    node.type === 'LogicalExpression' ||
    node.type === 'BinaryExpression' ||
    node.type === 'UnaryExpression'
  ) {
    return true;
  }

  // SpreadElement is dynamic
  if (node.type === 'SpreadElement') {
    return true;
  }

  return false;
}

/**
 * Check if an ObjectExpression contains only static values.
 * @param {object} node - ObjectExpression node.
 * @returns {boolean} True if all property values are static.
 */
function isStaticObject(node) {
  if (!node || node.type !== 'ObjectExpression') {
    return false;
  }

  for (const prop of node.properties) {
    if (prop.type !== 'Property') {
      continue;
    }

    // Skip spread elements
    if (prop.type === 'SpreadElement') {
      return false;
    }

    // Check if value is static
    if (!isStaticValue(prop.value)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an ArrayExpression contains only static values.
 * @param {object} node - ArrayExpression node.
 * @returns {boolean} True if all elements are static.
 */
function isStaticArray(node) {
  if (!node || node.type !== 'ArrayExpression') {
    return false;
  }

  for (const element of node.elements) {
    if (!element) {
      continue; // Skip holes in arrays
    }

    // Spread elements are dynamic
    if (element.type === 'SpreadElement') {
      return false;
    }

    // If element is an object, check if it's a static object
    if (element.type === 'ObjectExpression') {
      if (!isStaticObject(element)) {
        return false;
      }
      continue;
    }

    // Otherwise check if it's a static value
    if (!isStaticValue(element)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an expression is a computed/style reference (identifier or member expression).
 * @param {object} node - Expression node.
 * @returns {boolean} True if it's a reference to a computed property or method.
 */
function isComputedStyleReference(node) {
  if (!node) {
    return false;
  }

  // Simple identifier: :style="myStyles"
  if (node.type === 'Identifier') {
    return true;
  }

  // Member expression: :style="this.myStyles" or :style="computedStyles"
  if (node.type === 'MemberExpression') {
    return true;
  }

  // Call expression: :style="getStyles()"
  if (node.type === 'CallExpression') {
    return true;
  }

  return false;
}

/**
 * Check if an expression contains any dynamic value.
 * @param {object} node - Expression node.
 * @returns {boolean} True if the expression contains any dynamic value.
 */
function hasDynamicValue(node) {
  if (!node) {
    return false;
  }

  // If it's a computed reference, it's dynamic
  if (isComputedStyleReference(node)) {
    return true;
  }

  // If it's a static object or array, check its contents
  if (node.type === 'ObjectExpression') {
    return !isStaticObject(node);
  }

  if (node.type === 'ArrayExpression') {
    return !isStaticArray(node);
  }

  // Check if it's a dynamic value
  return isDynamicValue(node);
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow fixed inline styles in Vue templates',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: null,
    messages: {
      noFixedInlineStyle:
        'Avoid fixed inline styles. Move styles to the <style> block. See https://kolibri-dev.readthedocs.io/en/develop/frontend_architecture/core.html#styling',
      noFixedVStyleObject:
        'Avoid fixed inline style objects. Move styles to the <style> block. See https://kolibri-dev.readthedocs.io/en/develop/frontend_architecture/core.html#styling',
      noFixedVStyleArray:
        'Avoid fixed inline style arrays. Move styles to the <style> block. See https://kolibri-dev.readthedocs.io/en/develop/frontend_architecture/core.html#styling',
    },
    schema: [],
  },

  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /**
       * Check static style attributes: `<div style="color: red">`.
       * @param {VAttribute} node - VAttribute AST node for the style attribute.
       */
      'VAttribute[directive=false][key.name="style"]'(node) {
        if (node.value && node.value.value) {
          context.report({
            node: node.value || node,
            messageId: 'noFixedInlineStyle',
          });
        }
      },

      /**
       * Check dynamic style bindings: `<div :style="{color: 'red'}">`.
       * @param {VExpressionContainer} node - VExpressionContainer AST node.
       */
      "VAttribute[directive=true][key.name.name='bind'][key.argument.name='style'] > VExpressionContainer.value"(
        node,
      ) {
        if (!node.expression) {
          return;
        }

        const expr = node.expression;

        // If it's a computed/style reference, it's dynamic - don't report
        if (isComputedStyleReference(expr)) {
          return;
        }

        // If it's an object expression, check if all values are static
        if (expr.type === 'ObjectExpression') {
          if (isStaticObject(expr)) {
            context.report({
              node: expr,
              messageId: 'noFixedVStyleObject',
            });
          }
          return;
        }

        // If it's an array expression, check if all elements are static
        if (expr.type === 'ArrayExpression') {
          if (isStaticArray(expr)) {
            context.report({
              node: expr,
              messageId: 'noFixedVStyleArray',
            });
          }
          return;
        }

        // Other expressions (literals, template literals without placeholders)
        // are considered static if they evaluate to a style object
        if (isStaticValue(expr)) {
          context.report({
            node: expr,
            messageId: 'noFixedVStyleObject',
          });
        }
      },
    });
  },
};