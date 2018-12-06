/**
 * @fileoverview Requires specific casing for component registration
 */

'use strict';

const utils = require('eslint-plugin-vue/lib/utils');
const casing = require('eslint-plugin-vue/lib/utils/casing');

const allowedCaseOptions = ['PascalCase', 'camelCase', 'snake_case'];

function create(context) {
  const selectedCase = context.options[0];
  const caseType =
    allowedCaseOptions.indexOf(selectedCase) !== -1 ? selectedCase : allowedCaseOptions[0];
  const converter = casing.getConverter(caseType);

  return utils.executeOnVue(context, obj => {
    const node = obj.properties.find(
      p =>
        p.type === 'Property' &&
        p.key.type === 'Identifier' &&
        p.key.name === 'components' &&
        p.value.type === 'ObjectExpression'
    );

    if (!node) {
      return;
    }

    const items = node.value.properties;
    for (const item of items) {
      const componentName = item.key.name;
      const convertedName = converter(componentName);
      if (convertedName !== componentName) {
        context.report({
          node: item,
          message: 'Component "{{componentName}}" is not in {{caseType}}.',
          data: {
            componentName,
            caseType,
          },
        });
      }
    }
  });
}

module.exports = {
  meta: {
    docs: {
      description: 'enforce specific casing for component registration',
      category: undefined,
      url: undefined,
    },
    fixable: undefined,
    schema: [
      {
        enum: allowedCaseOptions,
      },
    ],
  },
  create,
};
