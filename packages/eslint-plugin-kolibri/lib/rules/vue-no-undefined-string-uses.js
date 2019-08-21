/**
 * @fileoverview Disallow attempted uses of undefined translation strings.
 */

'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const get = require('lodash/get');
const utils = require('../utils');

const $TR_FUNCTION = '$tr';

const create = context => {
  let hasTemplate;
  let definitionNodes = [];
  let usedStringNodes = [];

  const initialize = {
    Program(node) {
      if (!utils.checkVueEslintParser(context)) {
        return;
      }
      hasTemplate = Boolean(node.templateBody);
    },
  };

  const scriptVisitor = Object.assign(
    {},
    // Check for a use within an $tr() function - a 'true use' of the string.
    {
      'CallExpression[callee.type="MemberExpression"]'(node) {
        if (node.callee.property.name == $TR_FUNCTION && node.arguments.length) {
          node.arguments.forEach(arg => {
            if (arg.type == 'Literal') {
              usedStringNodes.push(arg);
            }
          });
        }
      },
    },
    {
      ObjectExpression(node) {
        if (get(node, 'parent.key.name') === '$trs') {
          node.properties.forEach(prop => {
            definitionNodes.push({ name: prop.key.name });
          });
        }
      },
    },
    eslintPluginVueUtils.executeOnVue(context, () => {
      if (!hasTemplate) {
        utils.reportUseOfUndefinedTranslation(context, definitionNodes, usedStringNodes);
      }
    })
  );

  const templateVisitor = Object.assign(
    {},
    {
      'CallExpression[callee.type="Identifier"]'(node) {
        if (node.callee.name == $TR_FUNCTION && node.arguments.length) {
          node.arguments.forEach(arg => {
            if (arg.type == 'Literal') {
              usedStringNodes.push(arg);
            }
          });
        }
      },
    },
    utils.executeOnRootTemplateEnd(() => {
      utils.reportUseOfUndefinedTranslation(context, definitionNodes, usedStringNodes);
    })
  );

  return Object.assign(
    {},
    initialize,
    eslintPluginVueUtils.defineTemplateBodyVisitor(context, templateVisitor, scriptVisitor)
  );
};

module.exports = {
  meta: {
    docs: {
      description: 'Disallow attempted uses of undefined translation strings.',
    },
    fixable: null,
  },
  create,
};
