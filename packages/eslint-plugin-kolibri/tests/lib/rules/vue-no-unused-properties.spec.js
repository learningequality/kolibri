'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-unused-properties');

const tester = new RuleTester({
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

tester.run('vue-no-unused-properties', rule, {
  valid: [
    // a property used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            props: ['count'],
            created() {
              alert(this.count + 1)
            }
          };
        </script>
      `,
    },

    // a property being watched
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            props: {
              count: {
                type: Number,
                default: 0
              }
            },
            watch: {
              count() {
                alert('Increased!');
              },
            },
          };
        </script>
      `,
    },

    // a property used as a template identifier
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            props: ['count']
          }
        </script>
      `,
    },

    // properties used in a template expression
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count1 + count2 }}</div>
        </template>

        <script>
          export default {
            props: ['count1', 'count2']
          };
        </script>
      `,
    },

    // a property used in v-if
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-if="count > 0"></div>
        </template>

        <script>
          export default {
            props: {
              count: {
                type: Number
              }
            }
          };
        </script>
      `,
    },

    // a property used in v-for
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-for="color in colors">{{ color }}</div>
        </template>

        <script>
          export default {
            props: {
              colors: {
                type: Array,
                default: () => []
              }
            }
          };
        </script>
      `,
    },

    // a property used in v-html
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-html="message" />
        </template>

        <script>
          export default {
            props: ['message']
          };
        </script>
      `,
    },

    // a property passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :count="count" />
        </template>

        <script>
          export default {
            props: ['count']
          };
        </script>
      `,
    },

    // a property used in v-on
    {
      filename: 'test.vue',
      code: `
        <template>
          <button @click="alert(count)" />
        </template>

        <script>
          export default {
            props: ['count']
          };
        </script>
      `,
    },

    // data used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            data () {
              return {
                count: 2
              };
            },
            created() {
              alert(this.count + 1)
            }
          };
        </script>
      `,
    },

    // data being watched
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            data() {
              return {
                count: 2
              };
            },
            watch: {
              count() {
                alert('Increased!');
              },
            },
          };
        </script>
      `,
    },

    // data used as a template identifier
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            data () {
              return {
                count: 2
              };
            }
          }
        </script>
      `,
    },

    // data used in a template expression
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count1 + count2 }}</div>
        </template>

        <script>
          export default {
            data () {
              return {
                count1: 1,
                count2: 2
              };
            }
          };
        </script>
      `,
    },

    // data used in v-if
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-if="count > 0"></div>
        </template>

        <script>
          export default {
            data () {
              return {
                count: 2
              };
            }
          };
        </script>
      `,
    },

    // data used in v-for
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-for="color in colors">{{ color }}</div>
        </template>

        <script>
          export default {
            data () {
              return {
                colors: ["purple", "green"]
              };
            }
          };
        </script>
      `,
    },

    // data used in v-html
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-html="message" />
        </template>

        <script>
          export default {
            data () {
              return {
                message: "<span>Hey!</span>"
              };
            }
          };
        </script>
      `,
    },

    // data used in v-model
    {
      filename: 'test.vue',
      code: `
        <template>
          <input v-model="count" />
        </template>

        <script>
          export default {
            data () {
              return {
                count: 2
              };
            }
          };
        </script>
      `,
    },

    // data passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :count="count" />
        </template>

        <script>
          export default {
            data () {
              return {
                count: 2
              };
            }
          };
        </script>
      `,
    },

    // data used in v-on
    {
      filename: 'test.vue',
      code: `
        <template>
          <button @click="count++" />
        </template>

        <script>
          export default {
            data () {
              return {
                count: 2
              };
            }
          };
        </script>
      `,
    },

    // computed property used in a script expression
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: {
              count() {
                return 2;
              }
            },
            created() {
              const dummy = this.count + 1;
            }
          };
        </script>
      `,
    },

    // computed property being watched
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: {
              count() {
                return 2;
              }
            },
            watch: {
              count() {
                alert('Increased!');
              },
            },
          };
        </script>
      `,
    },

    // computed property used as a template identifier
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count }}</div>
        </template>

        <script>
          export default {
            computed: {
              count() {
                return 2;
              }
            }
          }
        </script>
      `,
    },

    // computed properties used in a template expression
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ count1 + count2 }}</div>
        </template>

        <script>
          export default {
            computed: {
              count1() {
                return 1;
              },
              count2() {
                return 2;
              }
            }
          }
        </script>
      `,
    },

    // computed property used in v-if
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-if="count > 0"></div>
        </template>

        <script>
          export default {
            computed: {
              count() {
                return 2;
              }
            }
          }
        </script>
      `,
    },

    // computed property used in v-for
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-for="color in colors">{{ color }}</div>
        </template>

        <script>
          export default {
            computed: {
              colors() {
                return ["purple", "green"];
              }
            }
          };
        </script>
      `,
    },

    // computed property used in v-html
    {
      filename: 'test.vue',
      code: `
        <template>
          <div v-html="message" />
        </template>

        <script>
          export default {
            computed: {
              message() {
                return "<span>Hey!</span>";
              }
            }
          };
        </script>
      `,
    },

    // computed property used in v-model
    {
      filename: 'test.vue',
      code: `
        <template>
          <input v-model="fullName" />
        </template>

        <script>
          export default {
            data() {
              return {
                firstName: "David",
                lastName: "Attenborough"
              }
            },
            computed: {
              fullName: {
                get() {
                  return this.firstName + ' ' + this.lastName
                },
                set(newValue) {
                  var names = newValue.split(' ')
                  this.firstName = names[0]
                  this.lastName = names[names.length - 1]
                }
              }
            }
          };
        </script>
      `,
    },

    // computed property passed in a component
    {
      filename: 'test.vue',
      code: `
        <template>
          <counter :count="count" />
        </template>

        <script>
          export default {
            computed: {
              count() {
                return 2;
              }
            }
          }
        </script>
      `,
    },

    // ignores unused data when marked with eslint-disable
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            data () {
              return {
                // eslint-disable-next-line
                count: 2
              };
            }
          };
        </script>
      `,
    },

    // a property accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            props: ['count'],
            beforeRouteEnter (to, from, next) {
              next(vm => {
                alert(vm.count)
              })
            }
          };
        </script>
      `,
    },

    // data accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            data() {
              return {
                count: 2
              }
            },
            beforeRouteEnter (to, from, next) {
              next(vm => {
                alert(vm.count)
              })
            }
          };
        </script>
      `,
    },

    // a computed property accessed via instance parameter in `beforeRouteEnter`
    {
      filename: 'test.vue',
      code: `
        <script>
          export default {
            computed: {
              count() {
                return 2
              }
            },
            beforeRouteEnter (to, from, next) {
              next(vm => {
                alert(vm.count)
              })
            }
          };
        </script>
      `,
    },

    // a property used as a dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeName]="url"> ... </a>
        </template>

        <script>
          export default {
            props: ['attributeName']
          };
        </script>
      `,
    },

    // data used as a dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeName]="url"> ... </a>
        </template>

        <script>
          export default {
            data() {
              return {
                attributeName: 'href'
              };
            }
          };
        </script>
      `,
    },

    // a computed property used as a dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeName]="url"> ... </a>
        </template>

        <script>
          export default {
            computed: {
              attributeName() {
                return 'href';
              }
            }
          };
        </script>
      `,
    },
  ],

  invalid: [
    // unused property
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            props: ['count']
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused property found: "count"',
          line: 8,
        },
      ],
    },

    // unused data
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            data () {
              return {
                count: 2
              };
            }
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused data found: "count"',
          line: 10,
        },
      ],
    },

    // unused computed property
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>{{ cont }}</div>
        </template>

        <script>
          export default {
            computed: {
              count() {
                return 2;
              }
            }
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused computed property found: "count"',
          line: 9,
        },
      ],
    },

    // unused property - dynamic directive argument
    {
      filename: 'test.vue',
      code: `
        <template>
          <a :[attributeNam]="url"> ... </a>
        </template>

        <script>
          export default {
            props: ['attributeName']
          };
        </script>
      `,
      errors: [
        {
          message: 'Unused property found: "attributeName"',
          line: 8,
        },
      ],
    },
  ],
});
