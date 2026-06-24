/**
 * @file Prevent RTL-breaking inline styles in Vue components.
 * @author Learning Equality
 */

const utils = require('eslint-plugin-vue/lib/utils');

/**
 * @typedef {import('vue-eslint-parser').AST.VAttribute} VAttribute
 * @typedef {import('vue-eslint-parser').AST.VExpressionContainer} VExpressionContainer
 */

// RTL-breaking CSS properties (kebab-case and camelCase variants)
// Note: text-align, textAlign, float, and clear are NOT included here because
// they require value-based checking (e.g., 'center' is safe, 'left'/'right' are not)
const RTL_BREAKING_PROPERTIES = new Set([
  // Margin
  'margin-left',
  'margin-right',
  'marginLeft',
  'marginRight',
  // Padding
  'padding-left',
  'padding-right',
  'paddingLeft',
  'paddingRight',
  // Positioning
  'left',
  'right',
  // Border
  'border-left',
  'border-right',
  'borderLeft',
  'borderRight',
  'border-left-width',
  'border-right-width',
  'borderLeftWidth',
  'borderRightWidth',
  'border-left-color',
  'border-right-color',
  'borderLeftColor',
  'borderRightColor',
  'border-left-style',
  'border-right-style',
  'borderLeftStyle',
  'borderRightStyle',
  // Border radius
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  // Scroll margin
  'scroll-margin-left',
  'scroll-margin-right',
  'scrollMarginLeft',
  'scrollMarginRight',
  // Scroll padding
  'scroll-padding-left',
  'scroll-padding-right',
  'scrollPaddingLeft',
  'scrollPaddingRight',
]);

// Directional values for properties like text-align, float, and clear
const DIRECTIONAL_VALUES = new Set(['left', 'right']);

/**
 * Check if a CSS property is RTL-breaking.
 * @param {string} property - CSS property name.
 * @returns {boolean} True if the property breaks RTL layout.
 */
function isRtlBreakingProperty(property) {
  return RTL_BREAKING_PROPERTIES.has(property);
}

/**
 * Check if a value contains directional keywords.
 * @param {string} value - CSS value to check.
 * @returns {boolean} True if the value contains a directional keyword like 'left' or 'right'.
 */
function hasDirectionalValue(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const normalizedValue = value.toLowerCase().trim();

  // Check exact match first (most common case)
  if (DIRECTIONAL_VALUES.has(normalizedValue)) {
    return true;
  }

  // Check if value contains directional keywords (e.g., "right center" for background-position)
  const words = normalizedValue.split(/\s+/);
  return words.some(word => DIRECTIONAL_VALUES.has(word));
}

/**
 * Check if a conditional expression is RTL-aware (uses isRtl in the test).
 * @param {object} node - AST ConditionalExpression node.
 * @returns {boolean} True if the ternary condition references isRtl.
 */
function isRtlAwareTernary(node) {
  if (!node || node.type !== 'ConditionalExpression') {
    return false;
  }

  // Check if the test condition references 'isRtl'
  function containsIsRtl(testNode) {
    if (!testNode) {
      return false;
    }

    if (testNode.type === 'Identifier' && testNode.name === 'isRtl') {
      return true;
    }

    if (testNode.type === 'MemberExpression') {
      // Handle this.isRtl
      if (testNode.property.type === 'Identifier' && testNode.property.name === 'isRtl') {
        return true;
      }
    }

    if (testNode.type === 'UnaryExpression') {
      // Handle !isRtl
      return containsIsRtl(testNode.argument);
    }

    if (testNode.type === 'LogicalExpression') {
      // Handle isRtl && ... or isRtl || ...
      return containsIsRtl(testNode.left) || containsIsRtl(testNode.right);
    }

    return false;
  }

  return containsIsRtl(node.test);
}

/**
 * Check if static style attribute contains RTL-breaking properties.
 * @param {string} styleValue - The value of the style attribute.
 * @returns {boolean} True if any RTL-breaking property is found in the style string.
 */
function hasRtlBreakingStaticStyle(styleValue) {
  if (!styleValue) {
    return false;
  }

  // Split by semicolons to get individual style declarations
  const declarations = styleValue.split(';').filter(d => d.trim());

  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim());

    if (!property) {
      continue;
    }

    // Check if the property itself is RTL-breaking
    if (isRtlBreakingProperty(property)) {
      return true;
    }

    // Check for text-align, float, or clear with directional values
    if (
      (property === 'text-align' || property === 'float' || property === 'clear') &&
      value &&
      hasDirectionalValue(value)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extract string literal values from a ConditionalExpression (ternary).
 * @param {object} node - AST ConditionalExpression node.
 * @returns {Array<{value: string, node: object}>} String literals from the ternary branches.
 */
function extractTernaryStringLiterals(node) {
  const results = [];

  if (
    node.consequent &&
    node.consequent.type === 'Literal' &&
    typeof node.consequent.value === 'string'
  ) {
    results.push({ value: node.consequent.value, node: node.consequent });
  }

  if (
    node.alternate &&
    node.alternate.type === 'Literal' &&
    typeof node.alternate.value === 'string'
  ) {
    results.push({ value: node.alternate.value, node: node.alternate });
  }

  return results;
}

/**
 * Extract property names from an ObjectExpression node.
 * @param {object} node - AST ObjectExpression node.
 * @returns {Array<{property: string, node: object}>} RTL-breaking property names with their nodes.
 */
function extractObjectProperties(node) {
  const properties = [];

  if (!node || node.type !== 'ObjectExpression') {
    return properties;
  }

  for (const prop of node.properties) {
    if (prop.type !== 'Property') {
      continue;
    }

    let propertyName = null;

    // Handle both computed and non-computed properties
    if (prop.key.type === 'Identifier' && !prop.computed) {
      propertyName = prop.key.name;
    } else if (prop.key.type === 'Literal') {
      propertyName = String(prop.key.value);
    } else if (prop.computed && prop.key.type === 'ConditionalExpression') {
      // Handle computed keys with ternary expressions
      // e.g. { [isRtl ? 'marginRight' : 'marginLeft']: '8px' }
      // If the ternary uses isRtl in the test, this is an RTL-aware pattern - allow it
      if (isRtlAwareTernary(prop.key)) {
        continue;
      }
      const ternaryLiterals = extractTernaryStringLiterals(prop.key);
      for (const { value, node: literalNode } of ternaryLiterals) {
        if (isRtlBreakingProperty(value)) {
          properties.push({ property: value, node: literalNode });
        }
      }
      // Skip the rest of the loop iteration since we've handled this case
      continue;
    }

    if (propertyName && isRtlBreakingProperty(propertyName)) {
      // Note: isRtl ternary in the VALUE (e.g., marginLeft: isRtl ? 'x' : 'y')
      // does NOT make it safe - the property name is still directional.
      // Only isRtl ternary in computed KEYS is RTL-aware (handled above).
      properties.push({ property: propertyName, node: prop });
    }

    // Check for text-align, float, or clear with directional values
    if (
      propertyName === 'textAlign' ||
      propertyName === 'text-align' ||
      propertyName === 'float' ||
      propertyName === 'clear'
    ) {
      if (prop.value.type === 'Literal' && hasDirectionalValue(prop.value.value)) {
        properties.push({ property: propertyName, node: prop });
      }
    }
  }

  return properties;
}

/**
 * Recursively check expressions for RTL-breaking properties.
 * @param {object} node - AST node to check.
 * @returns {Array<{property: string, node: object}>} RTL-breaking property violations found.
 */
function checkExpression(node) {
  if (!node) {
    return [];
  }

  // ObjectExpression: { marginLeft: '8px' }
  if (node.type === 'ObjectExpression') {
    return extractObjectProperties(node);
  }

  // ArrayExpression: [style1, { marginLeft: '8px' }]
  if (node.type === 'ArrayExpression') {
    const violations = [];
    for (const element of node.elements) {
      if (element && element.type !== 'SpreadElement') {
        violations.push(...checkExpression(element));
      }
    }
    return violations;
  }

  // ConditionalExpression: condition ? { marginLeft: '8px' } : { marginRight: '8px' }
  if (node.type === 'ConditionalExpression') {
    return [...checkExpression(node.consequent), ...checkExpression(node.alternate)];
  }

  // LogicalExpression: foo && { marginLeft: '8px' }
  if (node.type === 'LogicalExpression') {
    return [...checkExpression(node.left), ...checkExpression(node.right)];
  }

  return [];
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow inline styles with RTL-breaking directional CSS properties in Vue templates',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: null,
    messages: {
      noRtlBreakingInlineStyles:
        'Avoid inline styles with directional properties ({{property}}). Use CSS classes instead for RTL support. See https://kolibri-dev.readthedocs.io/en/develop/i18n.html#inline-styles-and-rtl-compatibility',
      noRtlBreakingStaticStyles:
        'Avoid inline styles with directional properties. Use CSS classes instead for RTL support. See https://kolibri-dev.readthedocs.io/en/develop/i18n.html#inline-styles-and-rtl-compatibility',
    },
    schema: [],
  },

  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /**
       * Check static style attributes: `<div style="margin-left: 8px">`.
       * @param {VAttribute} node - VAttribute AST node for the style attribute.
       */
      'VAttribute[directive=false][key.name="style"]'(node) {
        if (!node.value || !node.value.value) {
          return;
        }

        if (hasRtlBreakingStaticStyle(node.value.value)) {
          context.report({
            node: node.value || node,
            messageId: 'noRtlBreakingStaticStyles',
          });
        }
      },

      /**
       * Check dynamic style bindings: `<div :style="{marginLeft: '8px'}">`.
       * @param {VExpressionContainer} node - VExpressionContainer AST node for the style
       * binding.
       */
      "VAttribute[directive=true][key.name.name='bind'][key.argument.name='style'] > VExpressionContainer.value"(
        node,
      ) {
        if (!node.expression) {
          return;
        }

        const violations = checkExpression(node.expression);

        for (const { property, node: violationNode } of violations) {
          context.report({
            node: violationNode,
            messageId: 'noRtlBreakingInlineStyles',
            data: {
              property,
            },
          });
        }
      },
    });
  },
};
