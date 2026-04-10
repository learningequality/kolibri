/**
 * @fileoverview Disallow stubs in Testing Library tests.
 * Frequent use of stubs undermine the purpose of user-oriented testing
 * with Testing Library. In rare cases where stubs are necessary,
 * the rule can be bypassed with a disable comment.
 */

'use strict';

const utils = require('../utils');

const TESTING_LIBRARY_IMPORT = '@testing-library/vue';

const TESTING_LIBRARY_RENDER = /^render(ToString)?$/;

module.exports = {
  meta: {
    docs: {
      description:
        'Disallow stubs in Testing Library tests. Frequent use of stubs undermine the purpose of user-oriented testing with Testing Library.',
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
          const stubsProp = arg.properties.find(
            p => p.type === 'Property' && p.key && p.key.name === 'stubs',
          );
          if (stubsProp) {
            context.report({
              node: stubsProp,
              message: 'Avoid using stubs.',
            });
          }
        }
      },
    };
  },
};
