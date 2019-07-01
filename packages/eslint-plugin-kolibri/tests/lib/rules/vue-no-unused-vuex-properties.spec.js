'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-unused-vuex-properties');

const tester = new RuleTester({
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

tester.run('vue-no-unused-vuex-properties', rule, {
  valid: [
    // a getter used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: mapGetters(['count']),
            created() {
              alert(this.count)
            }
          };
        </script>
      `,
    },

    // a getter being watched
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: mapGetters(['count']),
            watch: {
              count() {
                alert('Increased!');
              }
            }
          };
        </script>
      `,
    },

    // a getter used as a template identifier
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: mapGetters(['count'])
          }
        </script>
      `,
    },

    // getters used in a template expression
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count1 + count2 }}</div>
        </template>

        <script>
          export default {
            computed: mapGetters(['count1', 'count2'])
          };
        </script>
      `,
    },

    // a getter used in v-if
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-if="count > 0"></div>
        </template>

        <script>
          export default {
            computed: mapGetters(['count'])
          };
        </script>
      `,
    },

    // a getter used in v-for
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-for="color in colors">{{ color }}</div>
        </template>

        <script>
          export default {
            computed: mapGetters(['colors'])
          };
        </script>
      `,
    },

    // a getter used in v-html
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-html="message" />
        </template>

        <script>
          export default {
            computed: mapGetters(['message'])
          };
        </script>
      `,
    },

    // a getter passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :count="count" />
        </template>

        <script>
          export default {
            computed: mapGetters(['count'])
          };
        </script>
      `,
    },

    // a getter used in v-on
    {
      filename: 'test.vue',
      code: `
        <template>
          <button @click="alert(count)" />
        </template>

        <script>
          export default {
            computed: mapGetters(['count'])
          };
        </script>
      `,
    },

    // namespaced module getter
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: mapGetters('module', ['count'])
          }
        </script>
      `,
    },

    // a getter imported with spread operator
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: {
              ...mapGetters(['count'])
            }
          }
        </script>
      `,
    },

    // an aliased getter
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: {
              ...mapGetters({
                count: 'todosCount'
              })
            }
          }
        </script>
      `,
    },

    // state used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: mapState({
              count: state => state.todosCount,
            }),
            mounted() {
              alert(this.count)
            }
          };
        </script>
      `,
    },

    // state being watched
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: mapState({
              count: state => state.todosCount,
            }),
            watch: {
              count() {
                alert('Increased!');
              }
            }
          };
        </script>
      `,
    },

    // state used as a template identifier
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: mapState({
              count: state => state.todosCount,
            })
          }
        </script>
      `,
    },

    // state used in a template expression
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count1 + count2 }}</div>
        </template>

        <script>
          export default {
            computed: mapState({
              count1: state => state.todosCount,
              count2: state => state.anotherCount
            })
          };
        </script>
      `,
    },

    // state used in v-if
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-if="count > 0"></div>
        </template>

        <script>
          export default {
            computed: mapState({
              count: state => state.todosCount
            })
          };
        </script>
      `,
    },

    // state used in v-for
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-for="color in colors">{{ color }}</div>
        </template>

        <script>
          export default {
            computed: mapState({
              colors: state => state.themeColors
            })
          };
        </script>
      `,
    },

    // state used in v-html
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-html="message" />
        </template>

        <script>
          export default {
            computed: mapState({
              message: state => state.msg
            })
          };
        </script>
      `,
    },

    // state passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :count="count" />
        </template>

        <script>
          export default {
            computed: mapState({
              count: state => state.todosCount
            })
          };
        </script>
      `,
    },

    // state used in v-on
    {
      filename: 'test.vue',
      code: `
        <template>
          <button @click="alert(count)" />
        </template>

        <script>
          export default {
            computed: mapState({
              count: state => state.count
            })
          };
        </script>
      `,
    },

    // namespaced module state
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: mapState('module', {
              count: state => state.todosCount
            })
          }
        </script>
      `,
    },

    // state imported with spread operator
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: {
              ...mapState({
                count: state => state.todosCount
              })
            }
          }
        </script>
      `,
    },

    // state function
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ countPlusLocalState }}</div>
        </template>

        <script>
          export default {
            computed: mapState({
              countPlusLocalState (state) {
                return state.count + this.localCount
              }
            })
          }
        </script>
      `,
    },

    // state as an array
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: mapState(['count'])
          }
        </script>
      `,
    },

    // does not report nested arrays items
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: mapState({
              channelRootId: state => get(state, ['channel', 'root_id'], '')
            }),
            mounted() {
              alert(this.channelRootId)
            }
          };
        </script>
      `,
    },

    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ notificationsCount }}</div>
          <p>{{ message }}</p>

          <ul>
            <li v-for="user in users">{{ user.name }}</li>
          </ul>
        </template>

        <script>
          export default {
            computed: {
              ...mapState(['notificationsCount']),
              ...mapState('messages', {
                message: state => state.message
              }),
              ...mapGetters(['users']),
              ...mapGetters('todos', {
                todosCount: 'count'
              })
            },
            created() {
              alert(this.todosCount)
            }
          }
        </script>
      `,
    },

    // a getter accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: mapGetters(['count']),
            beforeRouteEnter (to, from, next) {
              next(vm => {
                alert(vm.count)
              })
            }
          };
        </script>
      `,
    },

    // state accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: mapState(['count']),
            beforeRouteEnter (to, from, next) {
              next(vm => {
                alert(vm.count)
              })
            }
          };
        </script>
      `,
    },

    // a getter used as a dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeName]="url"> ... </a>
        </template>

        <script>
          export default {
            computed: mapGetters(['attributeName']),
          };
        </script>
      `,
    },

    // state used as a dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeName]="url"> ... </a>
        </template>

        <script>
          export default {
            computed: mapState(['attributeName']),
          };
        </script>
      `,
    },
  ],

  invalid: [
    // unused getter
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            computed: mapGetters(['count'])
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex getter found: "count"',
          line: 8,
        },
      ],
    },

    // unused namespaced module getter
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            computed: mapGetters('module', ['count'])
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex getter found: "count"',
          line: 8,
        },
      ],
    },

    // unused getter - spread operator
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            computed: {
              ...mapGetters(['count'])
            }
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex getter found: "count"',
          line: 9,
        },
      ],
    },

    // unused aliased getter
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            computed: {
              ...mapGetters({
                count: 'todosCount'
              })
            }
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex getter found: "count"',
          line: 10,
        },
      ],
    },

    // unused state
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ todosCount }}</div>
        </template>

        <script>
          export default {
            computed: mapState({
              count: state => state.todosCount
            })
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex state found: "count"',
          line: 9,
        },
      ],
    },

    // unused namespaced module state
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            computed: mapState('module', {
              count: state => state.todosCount
            })
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex state found: "count"',
          line: 9,
        },
      ],
    },

    // unused state - spread operator
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ todosCount }}</div>
        </template>

        <script>
          export default {
            computed: {
              ...mapState({
                count: state => state.todosCount
              })
            }
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex state found: "count"',
          line: 10,
        },
      ],
    },

    // unused state function
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ contPlusLocalState }}</div>
        </template>

        <script>
          export default {
            computed: mapState({
              countPlusLocalState (state) {
                return state.count + this.localCount
              }
            })
          }
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex state found: "countPlusLocalState"',
          line: 9,
        },
      ],
    },

    // unused state as an array
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            computed: mapState(['count'])
          }
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex state found: "count"',
          line: 8,
        },
      ],
    },

    // unused getter - dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeNam]="url"> ... </a>
        </template>

        <script>
          export default {
            computed: mapGetters(['attributeName']),
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex getter found: "attributeName"',
          line: 8,
        },
      ],
    },

    // unused state - dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeNam]="url"> ... </a>
        </template>

        <script>
          export default {
            computed: mapState(['attributeName']),
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused Vuex state found: "attributeName"',
          line: 8,
        },
      ],
    },
  ],
});
