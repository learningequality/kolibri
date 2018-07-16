/**
 * @fileoverview Requires filename and component names to match
 * @author christianmemije
 */
'use strict';

const path = require('path');
const utils = require('../../../node_modules/eslint-plugin-vue/lib/utils');
const casing = require('../../../node_modules/eslint-plugin-vue/lib/utils/casing');

function create(context) {
  return utils.executeOnVue(context, obj => {
    const filePath = context.getFilename();

    const node = obj.properties.find(
      item => item.type === 'Property' && item.key.name === 'name' && item.value.type === 'Literal'
    );
    if (!node) {
      context.report({
        message: '"{{filePath}}" is missing a component name',
        data: {
          filePath,
        },
        loc: {
          start: {
            line: 1,
            column: 1,
          },
          end: {
            line: 1,
            column: 1,
          },
        },
      });
      return;
    }

    const componentName = node.value.value;

    const fileName = path.basename(filePath, '.vue');
    const parentDirName = path.basename(path.dirname(filePath));
    if (fileName.toLowerCase() === 'index') {
      if (
        casing.getConverter('PascalCase')(componentName) !==
        casing.getConverter('PascalCase')(parentDirName)
      ) {
        context.report({
          message: 'Parent dir of "{{filePath}}" does not match component name {{componentName}}.',
          data: {
            filePath,
            componentName,
          },
          loc: {
            start: {
              line: 1,
              column: 1,
            },
            end: {
              line: 1,
              column: 1,
            },
          },
        });
        return;
      }
    }

    if (componentName !== fileName) {
      context.report({
        message: 'Filename of "{{filePath}}" does not match component name {{componentName}}.',
        data: {
          filePath,
          componentName,
        },
        loc: {
          start: {
            line: 1,
            column: 1,
          },
          end: {
            line: 1,
            column: 1,
          },
        },
      });
    }
  });
}

module.exports = {
  meta: {
    docs: {
      description: 'enforce filenames anc component names to match',
      category: undefined,
      url: 'https://github.com/vuejs/eslint-plugin-vue/blob/v4.5.0/docs/rules/file-name-casing.md',
    },
    fixable: null,
  },
  create,
};
