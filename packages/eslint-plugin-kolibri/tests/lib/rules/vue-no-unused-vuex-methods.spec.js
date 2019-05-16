'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-unused-vuex-methods');

const tester = new RuleTester({
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

tester.run('vue-no-unused-vuex-methods', rule, {
  valid: [
    // a mutation used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: mapMutations(['save']),
            created() {
              this.save()
            }
          };
        </script>
      `,
    },

    // a mutation passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :increment="add" />
        </template>

        <script>
          export default {
            methods: mapMutations(['add'])
          };
        </script>
      `,
    },

    // a mutation used in v-on
    {
      filename: 'test.vue',
      code: `
        <template>
          <button @click="save" />
        </template>

        <script>
          export default {
            methods: mapMutations(['save'])
          };
        </script>
      `,
    },

    // a mutation used in a watcher (string method name)
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            watch: {
              counter: 'save'
            },
            methods: mapMutations(['save'])
          };
        </script>
      `,
    },

    // a mutation accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: mapMutations(['save']),
            beforeRouteEnter (to, from, next) {
              next(vm => {
                vm.save()
              })
            }
          };
        </script>
      `,
    },

    // namespaced module mutation
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: mapMutations('module', ['save']),
            created() {
              this.save()
            }
          };
        </script>
      `,
    },

    // a mutation imported with spread operator
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: {
              ...mapMutations(['save'])
            },
            created() {
              this.save()
            }
          };
        </script>
      `,
    },

    // an aliased mutation
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: {
              ...mapMutations({
                save: 'store'
              })
            },
            created() {
              this.save()
            }
          };
        </script>
      `,
    },

    // an action used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: mapActions(['save']),
            created() {
              this.save()
            }
          };
        </script>
      `,
    },

    // an action passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :increment="add" />
        </template>

        <script>
          export default {
            methods: mapActions(['add'])
          };
        </script>
      `,
    },

    // an action used in v-on
    {
      filename: 'test.vue',
      code: `
        <template>
          <button @click="save" />
        </template>

        <script>
          export default {
            methods: mapActions(['save'])
          };
        </script>
      `,
    },

    // an action used in a watcher (string method name)
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            watch: {
              counter: 'save'
            },
            methods: mapActions(['save'])
          };
        </script>
      `,
    },

    // an action accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: mapActions(['save']),
            beforeRouteEnter (to, from, next) {
              next(vm => {
                vm.save()
              })
            }
          };
        </script>
      `,
    },

    // namespaced module action
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: mapActions('module', ['save']),
            created() {
              this.save()
            }
          };
        </script>
      `,
    },

    // an action imported with spread operator
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: {
              ...mapActions(['save'])
            },
            created() {
              this.save()
            }
          };
        </script>
      `,
    },

    // an aliased action
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            methods: {
              ...mapActions({
                save: 'store'
              })
            },
            created() {
              this.save()
            }
          };
        </script>
      `,
    },
  ],

  invalid: [
    // unused mutation
    {
      filename: 'test.vue',
      code: `
        <template>
          <div @click="sav" />
        </template>

        <script>
          export default {
            methods: mapMutations(['save'])
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex mutation found: "save"',
          line: 8,
        },
      ],
    },

    // unused aliased mutation
    {
      filename: 'test.vue',
      code: `
        <template>
          <div @click="sav" />
        </template>

        <script>
          export default {
            methods: mapMutations({
              save: 'sav'
            })
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex mutation found: "save"',
          line: 9,
        },
      ],
    },

    // unused mutation - spread operator
    {
      filename: 'test.vue',
      code: `
        <template>
          <div @click="sav" />
        </template>

        <script>
          export default {
            methods: {
              ...mapMutations(['save'])
            }
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex mutation found: "save"',
          line: 9,
        },
      ],
    },

    // unused action
    {
      filename: 'test.vue',
      code: `
        <template>
          <div @click="sav" />
        </template>

        <script>
          export default {
            methods: mapActions(['save'])
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex action found: "save"',
          line: 8,
        },
      ],
    },

    // unused aliased action
    {
      filename: 'test.vue',
      code: `
        <template>
          <div @click="sav" />
        </template>

        <script>
          export default {
            methods: mapActions({
              save: 'sav'
            })
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex action found: "save"',
          line: 9,
        },
      ],
    },

    // unused action - spread operator
    {
      filename: 'test.vue',
      code: `
        <template>
          <div @click="sav" />
        </template>

        <script>
          export default {
            methods: {
              ...mapActions(['save'])
            }
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex action found: "save"',
          line: 9,
        },
      ],
    },
  ],
});
