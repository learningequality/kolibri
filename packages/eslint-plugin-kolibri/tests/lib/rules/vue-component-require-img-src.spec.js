const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-component-require-img-src');

const tester = new RuleTester({
  parser: require.resolve('vue-eslint-parser'),
  parserOptions: { ecmaVersion: 2020 },
});

tester.run('require-img-src', rule, {
  valid: [
    {
      code: `
      <template>
<img src="./image.png" />
</template>
`,
    },
  ],
  invalid: [
    {
      code: `
<template>
<img src=""/>
</template>
`,

      errors: [
        {
          messageId: 'missingSrcAttribute',
        },
      ],
    },
    {
      code: `
<template>
<img src/>
</template>
`,

      errors: [
        {
          messageId: 'missingSrcAttribute',
        },
      ],
    },
    {
      code: `
<template>
<img :src=""/>
</template>
`,

      errors: [
        {
          messageId: 'missingSrcAttribute',
        },
      ],
    },
    {
      code: `
  <template>
    <img>
  </template>
`,

      errors: [
        {
          messageId: 'missingSrcAttribute',
          line: 3,
          column: 5,
          endColumn: 10,
          endLine: 3,
        },
      ],
    },
  ],
});
