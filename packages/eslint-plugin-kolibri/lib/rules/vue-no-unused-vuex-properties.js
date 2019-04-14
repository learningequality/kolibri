/**
 * @fileoverview Disallow unused Vuex state and getters.
 */

'use strict';

const remove = require('lodash/remove');
const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const utils = require('../utils');

const GETTER = 'getter';
const STATE = 'state';

const reportUnusedVuexProperties = (context, properties) => {
  if (!properties || !properties.length) {
    return;
  }

  properties.forEach(property => {
    context.report({
      node: property.node,
      message: `Unused Vuex ${property.kind} found: "${property.name}"`,
    });
  });
};

const create = context => {
  let hasTemplate;
  let unusedVuexProperties = [];
  let thisExpressionsVariablesNames = [];

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
      computed: mapState({
        count: state => state.todosCount
      })

      computed: {
        ...mapState({
          count: state => state.todosCount
        })
      }

      computed: mapState({
        count (state) {
          return state.todosCount
        }
      })
    */
    {
      'CallExpression[callee.name=mapState][arguments] ObjectExpression Property[key.name]'(node) {
        unusedVuexProperties.push({
          kind: STATE,
          name: node.key.name,
          node,
        });
      },
    },
    /*
      computed: mapState(['count'])

      computed: {
        ...mapState(['count'])
      }
    */
    {
      'CallExpression[callee.name=mapState][arguments] ArrayExpression Literal[value]'(node) {
        unusedVuexProperties.push({
          kind: STATE,
          name: node.value,
          node,
        });
      },
    },
    /*
      computed: mapGetters(['count1', 'count2'])

      computed: {
        ...mapGetters(['count']),
      }
    */
    {
      'CallExpression[callee.name=mapGetters][arguments] ArrayExpression Literal[value]'(node) {
        unusedVuexProperties.push({
          kind: GETTER,
          name: node.value,
          node,
        });
      },
    },
    /*
      computed: mapGetters({
        count: 'todosCount'
      })

      computed: {
        ...mapGetters({
          count: 'todosCount'
        })
      }
    */
    {
      'CallExpression[callee.name=mapGetters][arguments] ObjectExpression Identifier[name]'(node) {
        unusedVuexProperties.push({
          kind: GETTER,
          name: node.name,
          node,
        });
      },
    },
    utils.executeOnThisExpressionProperty(property => {
      thisExpressionsVariablesNames.push(property.name);
    }),
    eslintPluginVueUtils.executeOnVue(context, obj => {
      const watchersNames = utils.getWatchersNames(obj);

      remove(unusedVuexProperties, property => {
        return (
          thisExpressionsVariablesNames.includes(property.name) ||
          watchersNames.includes(property.name)
        );
      });

      if (!hasTemplate && unusedVuexProperties.length) {
        reportUnusedVuexProperties(context, unusedVuexProperties);
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
        reportUnusedVuexProperties(context, unusedVuexProperties);
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
      description: 'Disallow unused Vuex state and getters',
    },
    fixable: null,
  },
  create,
};
