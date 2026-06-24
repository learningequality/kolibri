/**
 * @file Don't allow stubs in Testing Library tests.
 */

'use strict';

const utils = require('../utils');

const TESTING_LIBRARY_IMPORT = '@testing-library/vue';

const TESTING_LIBRARY_RENDER = /^render(ToString)?$/;

const ERROR_MESSAGE =
  'Avoid using stubs. See https://kolibri-dev.readthedocs.io/en/develop/frontend_architecture/unit_testing.html#avoid-using-stubs.';

module.exports = {
  meta: {
    docs: {
      description: "Don't allow stubs in Testing Library tests.",
    },
    fixable: null,
  },
  create(context) {
    let usesTestingLibrary = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value === TESTING_LIBRARY_IMPORT) {
          usesTestingLibrary = true;
        }
      },

      CallExpression(node) {
        if (!usesTestingLibrary) return;

        const method = utils.getCallMethodName(node);
        if (!method) return;

        if (!TESTING_LIBRARY_RENDER.test(method)) return;

        for (const arg of node.arguments) {
          if (arg.type !== 'ObjectExpression') continue;

          // render(Component, { stubs: ... })
          const stubsProp = arg.properties.find(
            p => p.type === 'Property' && p.key && p.key.name === 'stubs',
          );
          if (stubsProp) {
            context.report({ node: stubsProp, message: ERROR_MESSAGE });
          }

          // render(Component, { global: { stubs: ... } })
          const globalProp = arg.properties.find(
            p => p.type === 'Property' && p.key && p.key.name === 'global',
          );
          if (globalProp && globalProp.value && globalProp.value.type === 'ObjectExpression') {
            const nestedStubs = globalProp.value.properties.find(
              p => p.type === 'Property' && p.key && p.key.name === 'stubs',
            );
            if (nestedStubs) {
              context.report({ node: nestedStubs, message: ERROR_MESSAGE });
            }
          }
        }
      },
    };
  },
};
