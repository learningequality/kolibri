/**
 * @file Don't allow hardcoded strings in Testing Library queries.
 */

'use strict';

const utils = require('../utils');

const TESTING_LIBRARY_IMPORT = '@testing-library/vue';

// https://testing-library.com/docs/queries/about#types-of-queries
const TESTING_LIBRARY_QUERY = /^(get|query|getAll|queryAll|find|findAll)By\w+/;

// data-testid is a dev-defined literal in the template
const SKIP_ENTIRELY = /^(get|query|getAll|queryAll|find|findAll)ByTestId$/;

// role arg ('button', 'dialog') is a WAI-ARIA spec constant
const SKIP_FIRST_ARG = /^(get|query|getAll|queryAll|find|findAll)ByRole$/;

function isAllowed(node) {
  // CallExpression - deleteAction$(),coreString('facilitiesLabel')
  // MemberExpression - ReportsLearnerTable.$trs.allQuestionsAnswered.message
  // Identifier - COURSE_TITLE
  const ALLOWED_ARG_TYPES = new Set(['CallExpression', 'MemberExpression', 'Identifier']);

  // Standalone dashes (hyphen, en dash, em dash), digits,
  // and percentages are not typically translated => allow
  const ALLOWED_CHARACTERS = /^[\d\-–—]+%?$/;

  if (!node) return false;
  if (ALLOWED_ARG_TYPES.has(node.type)) return true;
  if (
    node.type === 'Literal' &&
    typeof node.value === 'string' &&
    ALLOWED_CHARACTERS.test(node.value)
  )
    return true;
  return false;
}

module.exports = {
  meta: {
    docs: {
      description: "Don't allow hardcoded strings in Testing Library queries.",
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

        // Allow hardcoded string in the first 'role' argument,
        // but don't allow it in the second 'name' argument
        if (SKIP_FIRST_ARG.test(method)) {
          const optionsArg = node.arguments[1];
          if (optionsArg && optionsArg.type === 'ObjectExpression') {
            const nameProp = optionsArg.properties.find(p => p.key && p.key.name === 'name');
            if (nameProp && !isAllowed(nameProp.value)) {
              context.report({
                node: nameProp.value,
                message: `Avoid hardcoded values in the name option of ${method}(). Use a translation key instead. See https://kolibri-dev.readthedocs.io/en/develop/frontend_architecture/unit_testing.html#reference-translation-keys-not-hardcoded-strings.`,
              });
            }
          }
          return;
        }

        const firstArg = node.arguments[0];
        if (!isAllowed(firstArg)) {
          context.report({
            node: firstArg,
            message: `Avoid hardcoded values in ${method}(). Use a translation key instead. See https://kolibri-dev.readthedocs.io/en/develop/frontend_architecture/unit_testing.html#reference-translation-keys-not-hardcoded-strings.`,
          });
        }
      },
    };
  },
};
