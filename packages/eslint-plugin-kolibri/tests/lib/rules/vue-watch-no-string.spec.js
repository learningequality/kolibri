'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-watch-no-string');
const { vueLanguageOptions } = require('../../helpers');

const tester = new RuleTester({
  languageOptions: vueLanguageOptions,
});

tester.run('vue-watch-no-string', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            watch: {
              username() {
                this.setSuggestionTerm()
              }
            }
          };
        </script>
      `,
    },

    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            watch: {
              username: {
                handler(newVal, OldVal) {
                  this.setSuggestionTerm()
                },
                immediate: true
              }
            }
          };
        </script>
      `,
    },
  ],

  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            watch: {
              username: 'setSuggestionTerm',
            }
          };
        </script>
      `,
      errors: [
        {
          message:
            'String method name syntax is not allowed in watchers. Please use a function instead.',
          line: 5,
        },
      ],
    },
  ],
});
