/**
 * @fileoverview Disallow unused Vuex mutations and actions.
 */

'use strict';

const remove = require('lodash/remove');
const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const utils = require('../utils');
const { VUEX_MUTATION, VUEX_ACTION } = require('../constants');

const create = context => {
  let hasTemplate;
  let unusedVuexProperties = [];
  let thisExpressionsVariablesNames = [];
  let befoureRouteEnterInstanceProperties = [];
  let watchStringMethods = [];

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
    /*
      methods: mapMutations({
        add: 'increment'
      })

      methods: {
        ...mapMutations({
          add: 'increment'
        })
      }
    */
    {
      'CallExpression[callee.name=mapMutations][arguments] ObjectExpression Property[key.name]'(
        node
      ) {
        unusedVuexProperties.push({
          kind: VUEX_MUTATION,
          name: node.key.name,
          node,
        });
      },
    },
    /*
      methods: mapMutations(['add'])

      methods: {
        ...mapMutations(['add'])
      }
    */
    {
      'CallExpression[callee.name=mapMutations][arguments] ArrayExpression Literal[value]'(node) {
        unusedVuexProperties.push({
          kind: VUEX_MUTATION,
          name: node.value,
          node,
        });
      },
    },
    /*
      methods: mapActions({
        add: 'increment'
      })

      methods: {
        ...mapActions({
          add: 'increment'
        })
      }
    */
    {
      'CallExpression[callee.name=mapActions][arguments] ObjectExpression Property[key.name]'(
        node
      ) {
        unusedVuexProperties.push({
          kind: VUEX_ACTION,
          name: node.key.name,
          node,
        });
      },
    },
    /*
    methods: mapActions(['add'])

    methods: {
      ...mapActions(['add'])
    }
  */
    {
      'CallExpression[callee.name=mapActions][arguments] ArrayExpression Literal[value]'(node) {
        unusedVuexProperties.push({
          kind: VUEX_ACTION,
          name: node.value,
          node,
        });
      },
    },
    utils.executeOnThisExpressionProperty(property => {
      thisExpressionsVariablesNames.push(property.name);
    }),
    utils.executeOnBefoureRouteEnterInstanceProperty(property => {
      befoureRouteEnterInstanceProperties.push(property.name);
    }),
    utils.executeOnWatchStringMethod(node => {
      watchStringMethods.push(node.value);
    }),
    eslintPluginVueUtils.executeOnVue(context, () => {
      remove(unusedVuexProperties, property => {
        return (
          thisExpressionsVariablesNames.includes(property.name) ||
          befoureRouteEnterInstanceProperties.includes(property.name) ||
          watchStringMethods.includes(property.name)
        );
      });

      if (!hasTemplate && unusedVuexProperties.length) {
        utils.reportUnusedVuexProperties(context, unusedVuexProperties);
      }
    })
  );

  const templateVisitor = Object.assign(
    {},
    {
      'VExpressionContainer[expression!=null][references]'(node) {
        const referencesNames = utils.getReferencesNames(node.references);

        remove(unusedVuexProperties, property => {
          return referencesNames.includes(property.name);
        });
      },
    },
    utils.executeOnRootTemplateEnd(() => {
      if (unusedVuexProperties.length) {
        utils.reportUnusedVuexProperties(context, unusedVuexProperties);
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
      description: 'Disallow unused Vuex mutations and actions',
    },
    fixable: null,
  },
  create,
};
