'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-unused-translations');

const tester = new RuleTester({
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

tester.run('vue-no-unused-translations', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('helloWorld') }}</h1>
        </div>
      </template>

      <script>
        export default {
          $trs: {
            helloWorld: 'Hello world',
          },
        }
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('helloWorld') }}</h1>
          <h2>{{ coachString('someCoachStringLabel') }}</h2>
        </div>
      </template>

      <script>
        import commonCoach from './common';
        export default {
          mixins: [commonCoach],
          $trs: {
            helloWorld: 'Hello world',
          },
        }
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('testString') }}</h1>
        </div>
      </template>

      <script>
        export default {
          methods: {
            labelPeople() {
              return this.$tr('personLabel');
            },
          },
          $trs: {
            testString: 'Test string',
            personLabel: 'Person',
          },
        }
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('testString') }}</h1>
        </div>
      </template>

      <script>
        export default {
          methods: {
            labelPeople() {
              return this.$tr('personLabel');
            },
          },
          $trs: {
            testString: 'Test string',
            personLabel: 'Person',
          },
        }
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script>
        export default {
          computed: {
            tooltipText() {
              const kindToLabeLMap = {
                [ContentNodeKinds.TOPIC]: 'topic',
                [ContentNodeKinds.CHANNEL]: 'channel',
                [ContentNodeKinds.EXERCISE]: 'exercise',
                [ContentNodeKinds.VIDEO]: 'video',
                [ContentNodeKinds.AUDIO]: 'audio',
                [ContentNodeKinds.DOCUMENT]: 'document',
                [ContentNodeKinds.HTML5]: 'html5',
                [ContentNodeKinds.EXAM]: 'exam',
                [ContentNodeKinds.LESSON]: 'lesson',
                [ContentNodeKinds.SLIDESHOW]: 'slideshow',
                [USER]: 'user',
              };
              const label = kindToLabeLMap[this.kind];
              return label ? this.$tr(label) : '';
            },
          },
          $trs: {
            topic: 'Topic',
            channel: 'Channel',
            exercise: 'Exercise',
            video: 'Video',
            audio: 'Audio',
            document: 'Document',
            html5: 'App',
            exam: 'Quiz',
            lesson: 'Lesson',
            user: 'User',
            slideshow: 'Slideshow',
          },
        }
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script>
        export default {
          computed: {
            contentTypesAsLabels() {
              return ['topic', 'channel', 'exercise'].map(f => $tr(f) + ":");
            },
          },
          $trs: {
            topic: 'Topic',
            channel: 'Channel',
            exercise: 'Exercise',
          },
        }
      </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>Hello World</h1>
        </div>
      </template>

      <script>
        export default {
          $trs: {
            helloWorld: 'Hello world',
          },
        }
      </script>
      `,
      errors: [
        {
          message: 'Unused message found in $trs: "helloWorld"',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('personLabel') }}</h1>
        </div>
      </template>

      <script>
        export default {
          $trs: {
            testString: 'Test string',
            personLabel: 'Person',
          },
        }
      </script>
      `,
      errors: [
        {
          message: 'Unused message found in $trs: "testString"',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('testString') }}</h1>
        </div>
      </template>

      <script>
        export default {
          methods: {
            labelPeople() {
              return this.$tr('personLabel');
            },
          },
          $trs: {
            testString: 'Test string',
            personLabel: 'Person',
            unusedLabel: 'Do not use this',
          },
        }
      </script>
      `,
      errors: [
        {
          message: 'Unused message found in $trs: "unusedLabel"',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('helloWorld') }}</h1>
          <h2>{{ coachString('coachLabel') }}</h2>
        </div>
      </template>

      <script>
        import commonCoach from './common';
        export default {
          mixins: [commonCoach],
          $trs: {
            helloWorld: 'Hello world',
            coachLabel: 'Coach',
          },
        }
      </script>
      `,
      errors: [
        {
          // Despite `coachLabel` being used in `coachString` - the definition
          // in this component would be going unused.
          message: 'Unused message found in $trs: "coachLabel"',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>{{ $tr('testString') }}</h1>
        </div>
      </template>

      <script>
        export default {
          methods: {
            labelPeople() {
              return this.$tr('personLabel');
            },
          },
          $trs: {
            testString: 'Test string',
            personLabel: 'Person',
            unusedLabel: 'Do not use this',
          },
        }
      </script>
      `,
      errors: [
        {
          message: 'Unused message found in $trs: "unusedLabel"',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <template>
        <div>
          <h1>testString</h1>
        </div>
      </template>

      <script>
        export default {
          methods: {
            labelPeople() {
              return this.someOtherFunc('personLabel');
            },
          },
          $trs: {
            testString: 'Test string',
            personLabel: 'Person',
            unusedLabel: 'Do not use this',
          },
        }
      </script>
      `,
      errors: [
        {
          message: 'Unused message found in $trs: "testString"',
        },
        {
          message: 'Unused message found in $trs: "personLabel"',
        },
        {
          message: 'Unused message found in $trs: "unusedLabel"',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
        export default {
          computed: {
            tooltipText() {
              const kindToLabeLMap = {
                [ContentNodeKinds.TOPIC]: 'topic',
                [ContentNodeKinds.CHANNEL]: 'channel',
                [ContentNodeKinds.EXERCISE]: 'exercise',
                [ContentNodeKinds.VIDEO]: 'video',
                [ContentNodeKinds.AUDIO]: 'audio',
                [ContentNodeKinds.DOCUMENT]: 'document',
                [ContentNodeKinds.HTML5]: 'html5',
                [ContentNodeKinds.EXAM]: 'exam',
                [USER]: 'user',
              };
              const label = kindToLabeLMap[this.kind];
              return label ? this.$tr(label) : '';
            },
          },
          $trs: {
            topic: 'Topic',
            channel: 'Channel',
            exercise: 'Exercise',
            video: 'Video',
            audio: 'Audio',
            document: 'Document',
            html5: 'App',
            exam: 'Quiz',
            lesson: 'Lesson',
            user: 'User',
            slideshow: 'Slideshow',
          },
        }
      </script>
      `,
      errors: [
        {
          message: 'Unused message found in $trs: "lesson"',
        },
        {
          message: 'Unused message found in $trs: "slideshow"',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
        export default {
          computed: {
            contentTypesAsLabels() {
              return ['topic'].map(f => $tr(f) + ":");
            },
          },
          $trs: {
            topic: 'Topic',
            channel: 'Channel',
            exercise: 'Exercise',
          },
        }
      </script>
      `,
      errors: [
        {
          message: 'Unused message found in $trs: "channel"',
        },
        {
          message: 'Unused message found in $trs: "exercise"',
        },
      ],
    },
  ],
});
