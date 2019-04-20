/**
 * @fileoverview Disallow unused methods.
 */

'use strict';

const remove = require('lodash/remove');
const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const utils = require('../utils');
const { GROUP_METHODS } = require('../constants');

const create = context => {
  let hasTemplate;
  let unusedProperties = [];
  let thisExpressionsVariablesNames = [];
  let befoureRouteEnterInstanceProperties = [];
  let watchStringMethods = [];

  const sourceCode = context.getSourceCode();
  const comments = sourceCode.getAllComments();

  const publicCommentsEnds = utils.getPublicCommentsEnds(comments);
  const disabledLines = publicCommentsEnds.map(value => value + 1);

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
    utils.executeOnThisExpressionProperty(property => {
      thisExpressionsVariablesNames.push(property.name);
    }),
    utils.executeOnBefoureRouteEnterInstanceProperty(property => {
      befoureRouteEnterInstanceProperties.push(property.name);
    }),
    utils.executeOnWatchStringMethod(node => {
      watchStringMethods.push(node.value);
    }),
    eslintPluginVueUtils.executeOnVue(context, obj => {
      unusedProperties = Array.from(
        eslintPluginVueUtils.iterateProperties(obj, new Set([GROUP_METHODS]))
      );

      remove(unusedProperties, property => {
        return (
          thisExpressionsVariablesNames.includes(property.name) ||
          befoureRouteEnterInstanceProperties.includes(property.name) ||
          watchStringMethods.includes(property.name)
        );
      });

      if (!hasTemplate && unusedProperties.length) {
        utils.reportUnusedProperties(context, unusedProperties, disabledLines);
      }
    })
  );

  const templateVisitor = Object.assign(
    {},
    {
      'VExpressionContainer[expression!=null][references]'(node) {
        const referencesNames = utils.getReferencesNames(node.references);

        remove(unusedProperties, property => {
          return referencesNames.includes(property.name);
        });
      },
    },
    utils.executeOnRootTemplateEnd(() => {
      if (unusedProperties.length) {
        utils.reportUnusedProperties(context, unusedProperties, disabledLines);
      }
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
      description: 'Disallow unused methods',
    },
    fixable: null,
  },
  create,
};
