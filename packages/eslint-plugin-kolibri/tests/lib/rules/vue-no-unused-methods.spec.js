'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-unused-methods');

const tester = new RuleTester({
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

tester.run('vue-no-unused-methods', rule, {
  valid: [
    // a method used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: {
              getCount() {
                return 2;
              }
            },
            created() {
              alert(this.getCount() + 1)
            }
          };
        </script>
      `,
    },

    // a method used in a template identifier
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ getCount() }}</div>
        </template>

        <script>
          export default {
            methods: {
              getCount() {
                return 2;
              }
            }
          }
        </script>
      `,
    },

    // methods used in a template expression
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ getCount1() + getCount2() }}</div>
        </template>

        <script>
          export default {
            methods: {
              getCount1() {
                return 1;
              },
              getCount2() {
                return 2;
              }
            }
          };
        </script>
      `,
    },

    // a method used in v-if
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-if="getCount() > 0"></div>
        </template>

        <script>
          export default {
            methods: {
              getCount() {
                return 2;
              }
            }
          };
        </script>
      `,
    },

    // a method used in v-for
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-for="color in getColors()">{{ color }}</div>
        </template>

        <script>
          export default {
            methods: {
              getColors() {
                return ['blue', 'green', 'violet'];
              }
            }
          };
        </script>
      `,
    },

    // a method used in v-html
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-html="getMessage()" />
        </template>

        <script>
          export default {
            methods: {
              getMessage() {
                return 'Hey!';
              }
            }
          };
        </script>
      `,
    },

    // a method passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :handler="countHandler" />
        </template>

        <script>
          export default {
            methods: {
              countHandler(count) {
                alert(count);
              }
            }
          };
        </script>
      `,
    },

    // a method used in v-on
    {
      filename: 'test.vue',
      code: `
        <template>
          <button @click="showMessage" />
        </template>

        <script>
          export default {
            methods: {
              showMessage() {
                alert('Hey!')
              }
            }
          };
        </script>
      `,
    },

    // a method used in a watcher (string method name)
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            watch: {
              counter: 'getCount'
            },
            methods: {
              getCount() {
                return 2;
              }
            }
          };
        </script>
      `,
    },

    // a public method
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: {
              /**
               * @public
               */
              getCount() {
                return 2;
              }
            }
          };
        </script>
      `,
    },

    // a method accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: {
              getCount() {
                return 2;
              }
            },
            beforeRouteEnter (to, from, next) {
              next(vm => {
                vm.getCount()
              })
            }
          };
        </script>
      `,
    },
  ],

  invalid: [
    // unused method
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ getCont() }}</div>
        </template>

        <script>
          export default {
            methods: {
              getCount() {
                return 2;
              }
            }
          };
        </script>
      `,
      errors: [
        {
          message:
            'Unused method found: "getCount". If the method is supposed to be public, you might have forgotten to add a @public tag.',
          line: 9,
        },
      ],
    },
  ],
});
