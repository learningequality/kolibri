'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/tests-no-stubs');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

// The rule is active only in files that import from Testing Library, so wrap code in a TL import
function withTestingLibrary(code) {
  return `import { render } from '@testing-library/vue';\n${code}`;
}

const STUBS_MESSAGE =
  'Avoid using stubs. See https://kolibri-dev.readthedocs.io/en/develop/frontend_architecture/unit_testing.html#avoid-using-stubs.';

tester.run('tests-no-stubs', rule, {
  valid: [
    { code: withTestingLibrary(`render(UsersTable);`) },
    { code: withTestingLibrary(`render(UsersTable, { props: { title: 'Title' } });`) },
    { code: withTestingLibrary(`render(UsersTable, { listeners: { close: closeHandler } });`) },
    { code: withTestingLibrary(`render(UsersTable, { store, routes });`) },
    // check that the rule is not active in obsolete Vue Test Utils files
    {
      code: `mount(UsersTable, { stubs: { SomeStub: true } });`,
    },
  ],

  invalid: [
    {
      code: withTestingLibrary(`render(UsersTable, { stubs: { SomeStub: true } });`),
      errors: [{ message: STUBS_MESSAGE }],
    },
    {
      code: withTestingLibrary(`render(UsersTable, { stubs: ['SomeStub'] });`),
      errors: [{ message: STUBS_MESSAGE }],
    },
    {
      code: withTestingLibrary(
        `render(UsersTable, { props: { title: 'Title' }, stubs: { SomeStub: true } });`,
      ),
      errors: [{ message: STUBS_MESSAGE }],
    },
    {
      code: withTestingLibrary(`render(UsersTable, { store, routes, stubs });`),
      errors: [{ message: STUBS_MESSAGE }],
    },
    {
      code: withTestingLibrary(`render(UsersTable, { store, routes, global: { stubs }});`),
      errors: [{ message: STUBS_MESSAGE }],
    },
  ],
});
