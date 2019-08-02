/**
 * @fileoverview Disallow unused translation string definitions.
 */

'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const utils = require('../utils');
const constants = require('../constants');

const { GROUP_$TRS } = constants;

const $TR_FUNCTIONS = ['$tr', 'coachString', 'coreString', 'learnString'];

const create = context => {
  let definitionNodes = [];
  let usedStrings = [];

  const initialize = {
    Program() {
      if (!utils.checkVueEslintParser(context)) {
        return;
      }
    },
  };

  const scriptVisitor = Object.assign(
    {},
    {
      'CallExpression[callee.type="MemberExpression"]'(node) {
        if ($TR_FUNCTIONS.includes(node.callee.property.name) && node.arguments.length) {
          node.arguments.forEach(arg => usedStrings.push(arg));
        }
      },
    },
    eslintPluginVueUtils.executeOnVue(context, obj => {
      definitionNodes = Array.from(
        eslintPluginVueUtils.iterateProperties(obj, new Set([GROUP_$TRS]))
      );
    })
  );

  const templateVisitor = Object.assign(
    {},
    {
      'CallExpression[callee.type="Identifier"]'(node) {
        if ($TR_FUNCTIONS.includes(node.callee.name) && node.arguments.length) {
          node.arguments.forEach(arg => Boolean(arg.value) && usedStrings.push(arg.value));
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
