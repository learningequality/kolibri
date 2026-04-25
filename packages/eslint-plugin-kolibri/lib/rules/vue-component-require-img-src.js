const utils = require('eslint-plugin-vue/lib/utils');

/** @typedef {import('vue-eslint-parser').AST.VElement} VElement */

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

  create(context) {
    function report(node) {
      context.report({
        node,
        messageId: 'missingSrcAttribute',
      });
    }

    return utils.defineTemplateBodyVisitor(context, {
      /**
       * Check img elements for a valid src attribute.
       * @param {VElement} node - Img tag element node.
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
