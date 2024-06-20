'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-component-class-name-casing');

const ruleTester = new RuleTester({
  parser: require.resolve('vue-eslint-parser'),
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

ruleTester.run('class-name-casing', rule, {
  valid: [
    { code: `<template><div class="is-allowed">Content</div></template>` },
    {
      code: `<template><div class="allowed" foo="barBar">Content</div></template>`,
    },
    {
      code: `<template><div :class="{'is-allowed': true}">Content</div></template>`,
    },
  ],

  invalid: [
    {
      code: `<template><div class="forBidden is-allowed" /></template>`,
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'VAttribute',
        },
      ],
    },
    {
      code: `<template><div :class="'forBidden' + ' ' + 'is-allowed' + someVar" /></template>`,
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'Literal',
        },
      ],
    },
    {
      code: `<template><div :class="{'forBidden': someBool, 'some-var': true}" /></template>`,
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'Literal',
        },
      ],
    },
    {
      code: `<template><div :class="{forBidden: someBool}" /></template>`,
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'Identifier',
        },
      ],
    },
    {
      code: '<template><div :class="`forBidden ${someVar}`" /></template>',
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'TemplateElement',
        },
      ],
    },
    {
      code: `<template><div :class="'forBidden'" /></template>`,
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'Literal',
        },
      ],
    },
    {
      code: `<template><div :class="['forBidden', 'is-allowed']" /></template>`,
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'Literal',
        },
      ],
    },
    {
      code: `<template><div :class="['allowed forBidden', someString]" /></template>`,
      errors: [
        {
          message: 'Class name "forBidden" is not kebab-case.',
          type: 'Literal',
        },
      ],
    },
  ],
});
