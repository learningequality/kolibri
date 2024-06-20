// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const utils = require('eslint-plugin-vue/lib//utils');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'detect duplicate ids in Vue components',
      categories: undefined,
    },
    fixable: null,
  },
  /** @param {RuleContext} context */
  create(context) {
    const IdAttrsMap = new Map();
    return utils.defineTemplateBodyVisitor(context, {
      /**
       * @param {VAttribute & { value: VLiteral } } node
       */
      'VAttribute[directive=false][key.name="id"]'(node) {
        const idAttr = node.value;
        if (!IdAttrsMap.has(idAttr.value)) {
          IdAttrsMap.set(idAttr.value, []);
        }
        const nodes = IdAttrsMap.get(idAttr.value);
        nodes.push(idAttr);
      },
      "VElement[parent.type!='VElement']:exit"() {
        IdAttrsMap.forEach(attrs => {
          if (Array.isArray(attrs) && attrs.length > 1) {
            attrs.forEach(attr => {
              context.report({
                node: attr,
                data: { id: attr.value },
                message: "The id '{{id}}' is duplicated.",
              });
            });
          }
        });
      },
    });
  },
};
