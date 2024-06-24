'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-component-no-duplicate-ids');

const ruleTester = new RuleTester({
  parser: require.resolve('vue-eslint-parser'),
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

ruleTester.run('no-duplicate-ids', rule, {
  valid: [
    { code: `<template><div id="allowed">Content</div></template>` },
    {
      code: `<template><div id="allowed">Content</div><div class="allowed">Here</div></template>`,
    },
    {
      code: `<template><div id="allowed">Content</div><div id="also">Here</div></template>`,
    },
  ],

  invalid: [
    {
      code: `<template><div id="allowed">Content</div><div id="allowed">Here</div></template>`,
      errors: [
        {
          message: "The id 'allowed' is duplicated.",
          type: 'VLiteral',
        },
        {
          message: "The id 'allowed' is duplicated.",
          type: 'VLiteral',
        },
      ],
    },
  ],
});
