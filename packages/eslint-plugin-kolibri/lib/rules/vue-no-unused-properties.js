/**
 * @fileoverview Disallow unused properties, data or computed properties.
 */

'use strict';

const remove = require('lodash/remove');
const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const utils = require('../utils');
const constants = require('../constants');

const { GROUP_PROPS, GROUP_DATA, GROUP_COMPUTED } = constants;

const create = context => {
  let hasTemplate;
  let unusedProperties = [];
  let thisExpressionsVariablesNames = [];
  let befoureRouteEnterInstanceProperties = [];

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
    eslintPluginVueUtils.executeOnVue(context, obj => {
      unusedProperties = Array.from(
        eslintPluginVueUtils.iterateProperties(
          obj,
          new Set([GROUP_PROPS, GROUP_DATA, GROUP_COMPUTED])
        )
      );

      const watchersNames = utils.getWatchersNames(obj);

      remove(unusedProperties, property => {
        return (
          thisExpressionsVariablesNames.includes(property.name) ||
          befoureRouteEnterInstanceProperties.includes(property.name) ||
          watchersNames.includes(property.name)
        );
      });

      if (!hasTemplate && unusedProperties.length) {
        utils.reportUnusedProperties(context, unusedProperties);
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
    utils.executeOnDirectiveDynamicArg(node => {
      const argName = utils.getDirectiveDynamicArgName(node);

      remove(unusedProperties, property => {
        return argName === property.name;
      });
    }),
    utils.executeOnRootTemplateEnd(() => {
      if (unusedProperties.length) {
        utils.reportUnusedProperties(context, unusedProperties);
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
      description: 'Disallow unused properties, data or computed properties',
    },
    fixable: null,
  },
  create,
};
