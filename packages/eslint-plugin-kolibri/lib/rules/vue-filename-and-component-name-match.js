/**
 * @fileoverview Requires filename and component names for vue files to match
 */

'use strict';

const path = require('path');
const utils = require('eslint-plugin-vue/lib/utils');

function create(context) {
  return utils.executeOnVue(context, obj => {
    const filePath = context.getFilename();

    // Skip if not .vue file
    if (!filePath.endsWith('vue')) {
      return;
    }

    const node = obj.properties.find(
      item => item.type === 'Property' && item.key.name === 'name' && item.value.type === 'Literal'
    );

    // Components require a name
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

    // If index.vue, parent dir should match component name
    if (fileName === 'index') {
      if (componentName !== parentDirName) {
        context.report({
          node: node.value,
          message:
            'Parent dir name "{{parentDirName}}" does not match component name "{{componentName}}".',
          data: {
            parentDirName,
            componentName,
          },
        });
      }
      return;
    }

    // Filename should match component name.
    // Assumes component name is already PascalCase since we use vue/name-property-casing
    if (componentName !== fileName) {
      context.report({
        node: node.value,
        message: 'Filename "{{fileName}}" does not match component name {{componentName}}.',
        data: {
          fileName,
          componentName,
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
