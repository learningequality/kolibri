// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const utils = require('eslint-plugin-vue/lib//utils');
const casing = require('eslint-plugin-vue/lib//utils/casing');

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Report a forbidden class casing.
 * @param {string} className - The class name to check.
 * @param {object} node - AST node to report on.
 * @param {object} context - ESLint rule context.
 * @param {string} caseType - The required casing type.
 * @returns {void}
 */
const reportForbiddenClassCasing = (className, node, context, caseType) => {
  if (!casing.getChecker(caseType)(className)) {
    const loc = node.value ? node.value.loc : node.loc;
    context.report({
      node,
      loc,
      message: 'Class name "{{class}}" is not {{caseType}}.',
      data: {
        class: className,
        caseType,
      },
    });
  }
};

/**
 * Extracts class name strings and their report nodes from an AST expression.
 * @param {object} node - AST expression node to extract class names from.
 * @param {boolean} [textOnly] - Whether to only extract text literals.
 * @yields {{ className: string, reportNode: object }} Class name and associated report node.
 */
function* extractClassNames(node, textOnly) {
  if (node.type === 'Literal') {
    yield* `${node.value}`.split(/\s+/).map(className => ({ className, reportNode: node }));
    return;
  }
  if (node.type === 'TemplateLiteral') {
    for (const templateElement of node.quasis) {
      yield* templateElement.value.cooked
        .split(/\s+/)
        .map(className => ({ className, reportNode: templateElement }));
    }
    for (const expr of node.expressions) {
      yield* extractClassNames(expr, true);
    }
    return;
  }
  if (node.type === 'BinaryExpression') {
    if (node.operator !== '+') {
      return;
    }
    yield* extractClassNames(node.left, true);
    yield* extractClassNames(node.right, true);
    return;
  }
  if (textOnly) {
    return;
  }
  if (node.type === 'ObjectExpression') {
    for (const prop of node.properties) {
      if (prop.type !== 'Property') {
        continue;
      }
      const classNames = utils.getStaticPropertyName(prop);
      if (!classNames) {
        continue;
      }
      yield* classNames.split(/\s+/).map(className => ({ className, reportNode: prop.key }));
    }
    return;
  }
  if (node.type === 'ArrayExpression') {
    for (const element of node.elements) {
      if (element == null) {
        continue;
      }
      if (element.type === 'SpreadElement') {
        continue;
      }
      yield* extractClassNames(element);
    }
    return;
  }
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce specific casing for the class naming style in template',
      categories: undefined,
    },
    fixable: null,
  },
  /**
   * Creates the rule's visitor object.
   * @param {object} context - ESLint rule context.
   * @returns {object} Visitor object with node handlers.
   */
  create(context) {
    const caseType = 'kebab-case';
    return utils.defineTemplateBodyVisitor(context, {
      /**
       * Check static class attributes for casing violations.
       * @param {object} node - VAttribute AST node with a VLiteral value.
       * @returns {void}
       */
      'VAttribute[directive=false][key.name="class"]'(node) {
        node.value.value
          .split(/\s+/)
          .forEach(className => reportForbiddenClassCasing(className, node, context, caseType));
      },

      /**
       * Check dynamic class bindings for casing violations.
       * @param {object} node - VExpressionContainer AST node.
       * @returns {void}
       */
      "VAttribute[directive=true][key.name.name='bind'][key.argument.name='class'] > VExpressionContainer.value"(
        node,
      ) {
        if (!node.expression) {
          return;
        }

        for (const { className, reportNode } of extractClassNames(node.expression)) {
          reportForbiddenClassCasing(className, reportNode, context, caseType);
        }
      },
    });
  },
};
