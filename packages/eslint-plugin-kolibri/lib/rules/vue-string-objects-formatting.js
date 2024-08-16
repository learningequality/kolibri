/**
 * @fileoverview Disallow improper formatting of translation strings.
 */

'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const get = require('lodash/get');
const utils = require('../utils');

const create = context => {
  let hasTemplate;
  const normalDefinitionNodes = [];

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
    {
      'CallExpression[callee.type="Identifier"]'(node) {
        if (node.callee.name == 'createTranslator' && node.arguments.length) {
          node.arguments.forEach(arg => {
            if (arg.type === 'ObjectExpression') {
              arg.properties.forEach(prop => {
                if (prop.value.type !== 'ObjectExpression') {
                  if (typeof prop.value.value !== 'string') {
                    context.report({
                      node: prop,
                      message: `Invalid translation string format detected within createTranslator(): "${prop.key.name}". Ensure proper formatting for translation strings.
                      `,
                    });
                  }
                } else {
                  const messageProperty = prop.value.properties.find(p => p.key.name === 'message');
                  const contextProperty = prop.value.properties.find(p => p.key.name === 'context');
                  if (
                    !messageProperty ||
                    prop.value.properties.find(
                      p => p.key.name !== 'message' && p.key.name !== 'context',
                    ) ||
                    (contextProperty && typeof contextProperty.value.value !== 'string')
                  ) {
                    context.report({
                      node: prop,
                      message: `Invalid translation string format detected within createTranslator(): "${prop.key.name}". Ensure proper formatting for translation strings.
                      `,
                    });
                  }
                }
              });
            }
          });
        }
      },
    },

    {
      ObjectExpression(node) {
        if (get(node, 'parent.key.name') === '$trs') {
          node.properties.forEach(prop => {
            if (prop.value.type !== 'ObjectExpression') {
              if (typeof prop.value.value !== 'string') {
                normalDefinitionNodes.push({ name: prop });
              }
            } else {
              const messageProperty = prop.value.properties.find(p => p.key.name === 'message');
              const contextProperty = prop.value.properties.find(p => p.key.name === 'context');
              if (
                !messageProperty ||
                prop.value.properties.find(
                  p => p.key.name !== 'message' && p.key.name !== 'context',
                ) ||
                (contextProperty && typeof contextProperty.value.value !== 'string')
              ) {
                normalDefinitionNodes.push({ name: prop });
              }
            }
          });
        }
      },
    },

    eslintPluginVueUtils.executeOnVue(context, () => {
      if (!hasTemplate) {
        utils.reportImproperTranslationString(context, normalDefinitionNodes);
      }
    }),
  );
  const templateVisitor = Object.assign(
    {},
    utils.executeOnRootTemplateEnd(() => {
      utils.reportImproperTranslationString(context, normalDefinitionNodes);
    }),
  );

  return Object.assign(
    {},
    initialize,
    eslintPluginVueUtils.defineTemplateBodyVisitor(context, templateVisitor, scriptVisitor),
  );
};

module.exports = {
  meta: {
    docs: {
      description: 'Disallow improper formatting of translation strings.',
    },
    fixable: null,
  },
  create,
};
