/**
 * @fileoverview Requires specific casing for component registration
 * @author christianmemije
 */
'use strict';

const utils = require('../../../node_modules/eslint-plugin-vue/lib/utils');
const casing = require('../../../node_modules/eslint-plugin-vue/lib/utils/casing');

const allowedCaseOptions = ['PascalCase', 'kebab-case', 'camelCase', 'snake_case'];

function create(context) {
  const options = context.options[0];
  const caseType = allowedCaseOptions.indexOf(options) !== -1 ? options : 'PascalCase';
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
          message: 'Component "{{name}}" is not in {{caseType}}.',
          data: {
            name: componentName,
            caseType: caseType,
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
