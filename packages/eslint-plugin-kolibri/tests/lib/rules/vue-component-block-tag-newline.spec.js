/**
 * Vendored and modified from:
 * https://github.com/vuejs/eslint-plugin-vue/blob/9b55f3c18403b0a77808ba758ec3a8e72a884036/tests/lib/rules/block-tag-newline.js
 */
'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-component-block-tag-newline');

const tester = new RuleTester({
  parser: require.resolve('vue-eslint-parser'),
  parserOptions: { ecmaVersion: 2015 },
});

tester.run('block-tag-newline', rule, {
  valid: [
    '<template>\n\n<input>\n\n</template>\n<script>\n\nlet a\n\n</script>',
    '<template>\n\n<div>\n</div>\n\n</template>\n<script>\n\nlet a\nlet b\n\n</script>',
    '<template></template>\n<script></script>',
    '<template>\n\n</template>\n<script>\n\n</script>',
    '<template>\n\n</template>\n<script>\n\n//comment\n\n</script>',
  ],
  invalid: [
    {
      code: '<template><input>\n</template>\n<script>let a\n</script>',
      output: '<template>\n\n<input>\n\n</template>\n<script>\n\nlet a\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks after '<template>', but 0 line breaks found.",
          line: 1,
          column: 11,
        },
        {
          message: "Expected 2 line breaks before '</template>', but 1 line break found.",
          line: 1,
          column: 18,
        },
        {
          message: "Expected 2 line breaks after '<script>', but 0 line breaks found.",
          line: 3,
          column: 9,
        },
        {
          message: "Expected 2 line breaks before '</script>', but 1 line break found.",
          line: 3,
          column: 14,
        },
      ],
    },
    {
      code: '<template>\n<input></template>\n<script>\nlet a</script>',
      output: '<template>\n\n<input>\n\n</template>\n<script>\n\nlet a\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks after '<template>', but 1 line break found.",
          line: 1,
          column: 11,
        },
        {
          message: "Expected 2 line breaks before '</template>', but 0 line breaks found.",
          line: 2,
          column: 8,
        },
        {
          message: "Expected 2 line breaks after '<script>', but 1 line break found.",
          line: 3,
          column: 9,
        },
        {
          message: "Expected 2 line breaks before '</script>', but 0 line breaks found.",
          line: 4,
          column: 6,
        },
      ],
    },
    {
      code: '<template><div>\n</div></template>\n<script>let a\nlet b</script>',
      output: '<template>\n\n<div>\n</div>\n\n</template>\n<script>\n\nlet a\nlet b\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks after '<template>', but 0 line breaks found.",
          line: 1,
          column: 11,
        },
        {
          message: "Expected 2 line breaks before '</template>', but 0 line breaks found.",
          line: 2,
          column: 7,
        },
        {
          message: "Expected 2 line breaks after '<script>', but 0 line breaks found.",
          line: 3,
          column: 9,
        },
        {
          message: "Expected 2 line breaks before '</script>', but 0 line breaks found.",
          line: 4,
          column: 6,
        },
      ],
    },
    {
      code: '<template><div>\n</div></template>\n<script>let a</script>',
      output: '<template>\n\n<div>\n</div>\n\n</template>\n<script>\n\nlet a\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks after '<template>', but 0 line breaks found.",
          line: 1,
          column: 11,
        },
        {
          message: "Expected 2 line breaks before '</template>', but 0 line breaks found.",
          line: 2,
          column: 7,
        },
        {
          message: "Expected 2 line breaks after '<script>', but 0 line breaks found.",
          line: 3,
          column: 9,
        },
        {
          message: "Expected 2 line breaks before '</script>', but 0 line breaks found.",
          line: 3,
          column: 14,
        },
      ],
    },
    {
      code: '<template>\n\n\n<input>\n\n</template>\n<script>\n\nlet a\nlet b\n\n\n</script>',
      output: '<template>\n\n<input>\n\n</template>\n<script>\n\nlet a\nlet b\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks after '<template>', but 3 line breaks found.",
          line: 1,
          column: 11,
        },
        {
          message: "Expected 2 line breaks before '</script>', but 3 line breaks found.",
          line: 10,
          column: 6,
        },
      ],
    },
    {
      code: '<script>\n  //comment\n\n</script>',
      output: '<script>\n\n  //comment\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks after '<script>', but 1 line break found.",
          line: 1,
          column: 9,
        },
      ],
    },
    {
      code: '<script>\n\n  //comment\n</script>',
      output: '<script>\n\n  //comment\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks before '</script>', but 1 line break found.",
          line: 3,
          column: 12,
        },
      ],
    },
    {
      code: '<script>\n  let a\n\n</script>',
      output: '<script>\n\n  let a\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks after '<script>', but 1 line break found.",
          line: 1,
          column: 9,
        },
      ],
    },
    {
      code: '<script>\n\n  let a</script>',
      output: '<script>\n\n  let a\n\n</script>',
      errors: [
        {
          message: "Expected 2 line breaks before '</script>', but 0 line breaks found.",
          line: 3,
          column: 8,
        },
      ],
    },
  ],
});
