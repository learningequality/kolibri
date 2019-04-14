/**
 * @fileoverview Disallow unused Vuex state and getters.
 */

'use strict';

const remove = require('lodash/remove');
const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const GROUP_WATCHER = 'watch';
const GETTER = 'getter';
const STATE = 'state';

const getReferencesNames = references => {
  if (!references || !references.length) {
    return [];
  }

  return references.map(reference => {
    if (!reference.id || !reference.id.name) {
      return;
    }

    return reference.id.name;
  });
};

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
  let rootTemplateEnd;
  let unusedVuexProperties = [];
  let thisExpressionsVariablesNames = [];

  const initialize = {
    Program(node) {
      if (context.parserServices.getTemplateBodyTokenStore == null) {
        context.report({
          loc: { line: 1, column: 0 },
          message:
            'Use the latest vue-eslint-parser. See also https://vuejs.github.io/eslint-plugin-vue/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error.',
        });
        return;
      }

      hasTemplate = Boolean(node.templateBody);
    },
  };

  const scriptVisitor = Object.assign(
    {
      'MemberExpression[object.type="ThisExpression"][property.type="Identifier"][property.name]'(
        node
      ) {
        thisExpressionsVariablesNames.push(node.property.name);
      },
    },
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
    eslintPluginVueUtils.executeOnVue(context, obj => {
      const watchers = Array.from(
        eslintPluginVueUtils.iterateProperties(obj, new Set([GROUP_WATCHER]))
      );
      const watchersNames = watchers.map(watcher => watcher.name);

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

  const templateVisitor = {
    'VExpressionContainer[expression!=null][references]'(node) {
      const referencesNames = getReferencesNames(node.references);

      remove(unusedVuexProperties, property => {
        return referencesNames.includes(property.name);
      });
    },
    // save root template end location - just a helper to be used
    // for a decision if a parser reached the end of the root template
    "VElement[name='template']"(node) {
      if (rootTemplateEnd) {
        return;
      }

      rootTemplateEnd = node.loc.end;
    },
    "VElement[name='template']:exit"(node) {
      if (node.loc.end !== rootTemplateEnd) {
        return;
      }

      if (unusedVuexProperties.length) {
        reportUnusedVuexProperties(context, unusedVuexProperties);
      }
    },
  };

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
