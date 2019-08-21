/**
 * @fileoverview Disallow unused translation string definitions.
 */

'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const get = require('lodash/get');
const utils = require('../utils');
const constants = require('../constants');

const { GROUP_$TRS } = constants;

const $TR_FUNCTION = '$tr';

const create = context => {
  let hasTemplate;
  let definitionNodes = [];
  let usedStrings = [];

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
            if (get(arg, ['value'])) {
              usedStrings.push(arg.value);
            }
          });
        }
      },
    },
    // This will include any defined Identifiers (eg, coachesLabel or submitAction) that is
    // found inside of an array or as the value assigned in an object. This covers the case
    // where a string may be used dynamically or in an iterator.
    {
      ObjectExpression(node) {
        if (get(node, 'parent.key.name') !== '$trs') {
          node.properties.forEach(prop => {
            if (get(prop, ['value', 'value'])) {
              usedStrings.push(prop.value.value);
            }
          });
        }
      },
    },
    {
      ArrayExpression(node) {
        node.elements.forEach(elem => {
          if (get(elem, ['value'])) {
            usedStrings.push(elem.value);
          }
        });
      },
    },
    eslintPluginVueUtils.executeOnVue(context, obj => {
      definitionNodes = Array.from(
        eslintPluginVueUtils.iterateProperties(obj, new Set([GROUP_$TRS]))
      );

      if (!hasTemplate) {
        utils.reportUnusedTranslations(context, definitionNodes, usedStrings);
      }
    })
  );

  const templateVisitor = Object.assign(
    {},
    {
      'CallExpression[callee.type="Identifier"]'(node) {
        if (node.callee.name == $TR_FUNCTION && node.arguments.length) {
          node.arguments.forEach(arg => {
            if (get(arg, ['value'])) {
              usedStrings.push(arg.value);
            }
          });
        }
      },
    },
    utils.executeOnRootTemplateEnd(() => {
      utils.reportUnusedTranslations(context, definitionNodes, usedStrings);
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
      description: 'Disallow unused translation string definitions.',
    },
    fixable: null,
  },
  create,
};
