/**
 * Vendored and modified from:
 * https://github.com/vuejs/eslint-plugin-vue/blob/9b55f3c18403b0a77808ba758ec3a8e72a884036/tests/lib/rules/padding-line-between-blocks.js
 */
'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-component-block-padding');

const tester = new RuleTester({
  parser: require.resolve('vue-eslint-parser'),
  parserOptions: { ecmaVersion: 2020 },
});

tester.run('vue-component-block-padding', rule, {
  valid: [
    `
     <template></template>


     <script></script>


     <style></style>
     `,
    `<template></template>


     <script></script>


     <style></style>`,
    // comments
    `
     <template></template>


     <!-- comment -->
     <script></script>


     <!-- comment -->
     <style></style>


     <!-- comment -->
     <!-- comment -->
     <i18n></i18n>
     `,
    `
     <template></template>


     <script>
     // comment

     </script>


     <style></style>


     <i18n></i18n>
     `,
    // no template
    `
     <script></script>


     <style></style>
     `,
    `var a = 1`,
  ],
  invalid: [
    {
      code: `
       <template></template>
       <script></script>
       <style></style>
       `,
      output: `
       <template></template>


       <script></script>


       <style></style>
       `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 3,
          column: 8,
          endLine: 3,
          endColumn: 25,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 4,
          column: 8,
          endLine: 4,
          endColumn: 23,
        },
      ],
    },
    {
      code: `
       <template></template><script></script><style></style>
       `,
      output: `
       <template></template>


<script></script>


<style></style>
       `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 2,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 2,
        },
      ],
    },
    {
      code: `
       <template></template>
       <!-- comment -->
       <script></script>
       <!-- comment -->
       <!-- comment -->
       <style></style>
       `,
      output: `
       <template></template>


       <!-- comment -->
       <script></script>


       <!-- comment -->
       <!-- comment -->
       <style></style>
       `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 4,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 7,
        },
      ],
    },
    {
      code: `
       <template></template>TEXT
       <!-- comment --><script></script><!-- comment
       comment --><style></style>
       `,
      output: `
       <template></template>TEXT


       <!-- comment --><script></script>


<!-- comment
       comment --><style></style>
       `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 3,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 4,
        },
      ],
    },
    {
      code: `
      <template></template>



      <script></script>



      <style></style>
      `,
      output: `
      <template></template>


      <script></script>


      <style></style>
      `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 6,
          column: 7,
          endLine: 6,
          endColumn: 24,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 10,
          column: 7,
          endLine: 10,
          endColumn: 22,
        },
      ],
    },
    {
      code: `
      <template></template>



      <!-- comment -->
      <script></script>



      <!-- comment -->
      <!-- comment -->
      <style></style>
      `,
      output: `
      <template></template>


      <!-- comment -->
      <script></script>


      <!-- comment -->
      <!-- comment -->
      <style></style>
      `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 7,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 13,
        },
      ],
    },
    {
      code: `
      <template></template>TEXT



      <!-- comment --><script></script><!-- comment
      comment --><style></style>
      `,
      output: `
      <template></template>TEXT


      <!-- comment --><script></script>


<!-- comment
      comment --><style></style>
      `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 6,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 7,
        },
      ],
    },
    {
      code: `
      <template></template>



      <script></script>
      <style></style>
      `,
      output: `
      <template></template>


      <script></script>


      <style></style>
      `,
      errors: [
        {
          message: 'Expected two blank lines before this block.',
          line: 6,
          column: 7,
          endLine: 6,
          endColumn: 24,
        },
        {
          message: 'Expected two blank lines before this block.',
          line: 7,
          column: 7,
          endLine: 7,
          endColumn: 22,
        },
      ],
    },
  ],
});
