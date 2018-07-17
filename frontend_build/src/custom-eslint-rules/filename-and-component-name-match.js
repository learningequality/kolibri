/**
 * @fileoverview Requires filename and component names to match
 */

 'use strict';

const path = require('path');
const utils = require('../../../node_modules/eslint-plugin-vue/lib/utils');

function create(context) {
  return utils.executeOnVue(context, obj => {
    const filePath = context.getFilename();

    if(!filePath.endsWith('vue')) {
      return;
    }

    const node = obj.properties.find(
      item => item.type === 'Property' && item.key.name === 'name' && item.value.type === 'Literal'
    );
    if (!node) {
      context.report({
        message: 'Component is missing a component name',
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
    if (fileName === 'index') {
      if (componentName !== parentDirName) {
        context.report({
          message: 'Parent dir name "{{parentDirName}}" does not match component name "{{componentName}}".',
          data: {
            parentDirName,
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
      return;
    }

    if (componentName !== fileName) {
      context.report({
        message: 'Filename "{{fileName}}" does not match component name {{componentName}}.',
        data: {
          fileName,
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
      description: 'enforce filenames and component names to match',
      category: undefined,
      url: undefined,
    },
    fixable: undefined,
  },
  create,
};
