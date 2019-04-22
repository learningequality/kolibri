/**
 * @fileoverview Disallow string method syntax in watchers.
 */

'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const create = context => {
  const scriptVisitor = {
    'ExportDefaultDeclaration > ObjectExpression > Property[key.name=watch] > ObjectExpression > Property[value.type=Literal]'(
      node
    ) {
      context.report({
        node,
        message:
          'String method name syntax is not allowed in watchers. Please use a function instead.',
      });
    },
  };

  const templateVisitor = {};

  return Object.assign(
    {},
    eslintPluginVueUtils.defineTemplateBodyVisitor(context, templateVisitor, scriptVisitor)
  );
};

module.exports = {
  meta: {
    docs: {
      description: 'Disallow string method syntax in watchers',
    },
    fixable: null,
  },
  create,
};
