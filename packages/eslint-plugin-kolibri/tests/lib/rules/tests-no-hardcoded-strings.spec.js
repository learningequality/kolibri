'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/tests-no-hardcoded-strings');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

// The rule is active only in files that import from Testing Library, so wrap code in a TL import
function withTestingLibrary(code) {
  return `import { screen } from '@testing-library/vue';\n${code}`;
}

function assertRoleMessage(method) {
  return `Avoid hardcoded values in the name option of ${method}(). Use a translation key instead.`;
}

function assertMessage(method) {
  return `Avoid hardcoded values in ${method}(). Use a translation key instead.`;
}

tester.run('tests-no-hardcoded-strings', rule, {
  valid: [
    // by test ID
    { code: withTestingLibrary(`getByTestId('users-table');`) },
    { code: withTestingLibrary(`queryByTestId('users-table');`) },

    // by role
    { code: withTestingLibrary(`getByRole('button');`) },
    { code: withTestingLibrary(`findByRole('button', { name: coreString('closeLabel') });`) },
    { code: withTestingLibrary(`getAllByRole('button', { name: closeLabel$() });`) },

    // by text
    { code: withTestingLibrary(`getByText(closeLabel$());`) },
    { code: withTestingLibrary(`queryByText(coreString('closeLabel'));`) },
    { code: withTestingLibrary(`findAllByText(UsersTable.$trs.title.message);`) },
    { code: withTestingLibrary(`getAllByText(COURSE_TITLE);`) },

    // other
    { code: withTestingLibrary(`getAllByLabelText(closeLabel$());`) },
    { code: withTestingLibrary(`findByPlaceholderText(InputComponent.$trs.placeholder.message);`) },
    { code: withTestingLibrary(`queryByAltText(ALT_TEXT);`) },
    { code: withTestingLibrary(`queryAllByTitle(title$());`) },
    { code: withTestingLibrary(`getByDisplayValue(valueVariable);`) },

    // method accessed as a property
    { code: withTestingLibrary(`screen.getByTestId('users-table');`) },
    { code: withTestingLibrary(`screen.getByText(closeLabel$());`) },
    {
      code: withTestingLibrary(
        `within(modal).findByRole('button', { name: coreString('closeLabel') });`,
      ),
    },
  ],

  invalid: [
    // by role
    {
      code: withTestingLibrary(`getByRole('button', { name: 'Close' });`),
      errors: [
        {
          message: assertRoleMessage('getByRole'),
        },
      ],
    },
    {
      code: withTestingLibrary(`findAllByRole('button', { name: /close/i });`),
      errors: [
        {
          message: assertRoleMessage('findAllByRole'),
        },
      ],
    },
    {
      code: withTestingLibrary(`queryByRole('button', { name: /close/i });`),
      errors: [
        {
          message: assertRoleMessage('queryByRole'),
        },
      ],
    },
    // by text
    {
      code: withTestingLibrary(`getByText('Close');`),
      errors: [
        {
          message: assertMessage('getByText'),
        },
      ],
    },
    {
      code: withTestingLibrary(`findAllByText(/close/i);`),
      errors: [
        {
          message: assertMessage('findAllByText'),
        },
      ],
    },
    {
      code: withTestingLibrary(`queryByText('Close');`),
      errors: [
        {
          message: assertMessage('queryByText'),
        },
      ],
    },
    // other
    {
      code: withTestingLibrary(`getByLabelText('First name');`),
      errors: [
        {
          message: assertMessage('getByLabelText'),
        },
      ],
    },
    {
      code: withTestingLibrary(`getByPlaceholderText('Enter text');`),
      errors: [
        {
          message: assertMessage('getByPlaceholderText'),
        },
      ],
    },
    {
      code: withTestingLibrary(`getByAltText('Profile photo');`),
      errors: [
        {
          message: assertMessage('getByAltText'),
        },
      ],
    },
    {
      code: withTestingLibrary(`getByTitle('Users table');`),
      errors: [
        {
          message: assertMessage('getByTitle'),
        },
      ],
    },
    {
      code: withTestingLibrary(`getByDisplayValue('Option A');`),
      errors: [
        {
          message: assertMessage('getByDisplayValue'),
        },
      ],
    },
    // method accessed as a property
    {
      code: withTestingLibrary(`screen.getByText('Close');`),
      errors: [
        {
          message: assertMessage('getByText'),
        },
      ],
    },
    {
      code: withTestingLibrary(`within(modal).findByRole('button', { name: /close/i });`),
      errors: [
        {
          message: assertRoleMessage('findByRole'),
        },
      ],
    },
  ],
});
