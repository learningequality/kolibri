/**
 * @fileoverview Disallow hardcoded strings in Testing Library queries.
 * Queries must reference translation keys instead.
 */

'use strict';

const utils = require('../utils');

const TESTING_LIBRARY_IMPORT = '@testing-library/vue';

// https://testing-library.com/docs/queries/about#types-of-queries
const TESTING_LIBRARY_QUERY = /^(get|query|getAll|queryAll|find|findAll)By\w+/;

// Role arg ('button', 'dialog') is a WAI-ARIA spec constant
const SKIP_FIRST_ARG = /^(get|query|getAll|queryAll|find|findAll)ByRole$/;

// data-testid is a dev-defined literal in the template => allow string literal
const SKIP_ENTIRELY = /^(get|query|getAll|queryAll|find|findAll)ByTestId$/;

// CallExpression - e.g. coreString('facilitiesLabel')
// MemberExpression - e.g. ReportsLearnerTable.$trs.allQuestionsAnswered.message
// Identifier: - e.g. COURSE_TITLE
const ALLOWED_ARG_TYPES = new Set(['CallExpression', 'MemberExpression', 'Identifier']);

// Returns true when the node is a value that cannot
// be traced back to a translation key
function isHardcoded(node) {
  return node && !ALLOWED_ARG_TYPES.has(node.type);
}

module.exports = {
  meta: {
    docs: {
      description:
        'Disallow hardcoded strings in Testing Library queries. Queries must reference translation keys instead.',
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

        if (!TESTING_LIBRARY_QUERY.test(method)) return;
        if (SKIP_ENTIRELY.test(method)) return;

        // Allow string literal in the first 'role' argument,
        // but don't allow it in the second 'name' argument
        if (SKIP_FIRST_ARG.test(method)) {
          const optionsArg = node.arguments[1];
          if (optionsArg && optionsArg.type === 'ObjectExpression') {
            const nameProp = optionsArg.properties.find(p => p.key && p.key.name === 'name');
            if (nameProp && isHardcoded(nameProp.value)) {
              context.report({
                node: nameProp.value,
                message: `Avoid hardcoded values in the name option of ${method}(). Use a translation key instead.`,
              });
            }
          }
          return;
        }

        const firstArg = node.arguments[0];
        if (isHardcoded(firstArg)) {
          context.report({
            node: firstArg,
            message: `Avoid hardcoded values in ${method}(). Use a translation key instead.`,
          });
        }
      },
    };
  },
};
