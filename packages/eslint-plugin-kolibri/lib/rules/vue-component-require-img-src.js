const utils = require('eslint-plugin-vue/lib/utils');

module.exports = {
  meta: {
    type: 'code',

    docs: {
      description: 'Require `src` attribute of `<img>` tag',
      category: undefined,
    },

    fixable: null,
    messages: {
      missingSrcAttribute: 'Missing `src` attribute of `<img>` tag',
    },
  },

  /**
   * Creates the rule's visitor object.
   * @param {object} context - ESLint rule context.
   * @returns {object} Visitor object with node handlers.
   */
  create(context) {
    /**
     * Reports a missing or invalid src attribute on a node.
     * @param {object} node - AST node to report on.
     * @returns {void}
     */
    function report(node) {
      context.report({
        node,
        messageId: 'missingSrcAttribute',
      });
    }

    return utils.defineTemplateBodyVisitor(context, {
      /**
       * Check img elements for a valid src attribute.
       * @param {object} node - VElement AST node for the img tag.
       * @returns {void}
       */
      "VElement[rawName='img']"(node) {
        const srcAttr = utils.getAttribute(node, 'src');
        if (srcAttr) {
          const value = srcAttr.value;
          if (!value || !value.value) {
            report(value || srcAttr);
          }
          return;
        }
        const srcDir = utils.getDirective(node, 'bind', 'src');
        if (srcDir) {
          const value = srcDir.value;
          if (!value || !value.expression) {
            report(value || srcDir);
          }
          return;
        }

        report(node.startTag);
      },
    });
  },
};
