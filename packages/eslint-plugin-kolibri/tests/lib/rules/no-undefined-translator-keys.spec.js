'use strict';

const path = require('node:path');
const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/no-undefined-translator-keys');

// Compute test file path dynamically so it works on any machine
const testFilePath = path.join(__dirname, 'test.js');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

tester.run('no-undefined-translator-keys', rule, {
  valid: [
    // ========================================
    // Valid Cases
    // ========================================

    // 1. Basic valid destructuring
    {
      code: `
        const translator = createTranslator('NS', { validKey: 'msg' });
        const { validKey$ } = translator;
      `,
    },

    // 2. Multiple valid keys
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a', key2: 'b', key3: 'c' });
        const { key1$, key2$, key3$ } = translator;
      `,
    },

    // 3. Object format messages
    {
      code: `
        const translator = createTranslator('NS', {
          key1: { message: 'msg', context: 'ctx' },
          key2: { message: 'msg2' }
        });
        const { key1$, key2$ } = translator;
      `,
    },

    // 4. Exported translator with destructuring in same file
    {
      code: `
        export const translator = createTranslator('NS', { validKey: 'msg', anotherKey: 'msg2' });
        const { validKey$ } = translator;
      `,
    },

    // 5. Direct method calls (not validated by this rule)
    // This rule only validates destructuring, not $tr() method calls
    {
      code: `
        const translator = createTranslator('NS', { key: 'msg' });
        translator.$tr('key');
      `,
    },

    // 6. Non-translator destructuring (should not error)
    {
      code: `
        const regularObj = { someKey$: () => {} };
        const { someKey$ } = regularObj;
      `,
    },

    // 7. Partial destructuring (only some keys)
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a', key2: 'b', key3: 'c' });
        const { key1$ } = translator;
        const { key2$ } = translator;
      `,
    },

    // 8. Spread operator with valid key
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a', key2: 'b' });
        const { key1$, ...rest } = translator;
      `,
    },

    // 9. Renamed destructuring (aliasing)
    {
      code: `
        const translator = createTranslator('NS', { validKey: 'msg' });
        const { validKey$: myLabel } = translator;
      `,
    },

    // 10. Multiple destructuring statements from same translator
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a', key2: 'b' });
        const { key1$ } = translator;
        const { key2$ } = translator;
      `,
    },

    // 11. Complex nested property values
    {
      code: `
        const translator = createTranslator('NS', {
          userLabel: 'User',
          adminLabel: 'Administrator',
          coachLabel: 'Coach',
          learnerLabel: 'Learner',
        });
        const { userLabel$, adminLabel$, coachLabel$, learnerLabel$ } = translator;
      `,
    },

    // 12. String literal keys
    {
      code: `
        const translator = createTranslator('NS', {
          'key-with-dash': 'msg',
        });
        const { 'key-with-dash$': keyWithDash } = translator;
      `,
    },

    // 13. Empty destructuring (no properties)
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a' });
        const {} = translator;
      `,
    },

    // 14. Multiple translators
    {
      code: `
        const translator1 = createTranslator('NS1', { key1: 'a' });
        const translator2 = createTranslator('NS2', { key2: 'b' });
        const { key1$ } = translator1;
        const { key2$ } = translator2;
      `,
    },

    // 15. Translator not immediately destructured
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a' });
        function useTranslator() {
          const { key1$ } = translator;
        }
      `,
    },

    // ========================================
    // Cross-file Import Cases
    // ========================================

    // 16. Import and destructure valid key
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { userLabel$ } = testStrings;
      `,
    },

    // 17. Import and destructure multiple valid keys
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { userLabel$, adminLabel$, coachLabel$ } = testStrings;
      `,
    },

    // 18. Import from another translator
    {
      filename: testFilePath,
      code: `
        import { anotherTranslator } from './fixtures/testStrings';
        const { saveAction$, cancelAction$ } = anotherTranslator;
      `,
    },

    // 19. Multiple imports and destructuring
    {
      filename: testFilePath,
      code: `
        import { testStrings, anotherTranslator } from './fixtures/testStrings';
        const { userLabel$ } = testStrings;
        const { saveAction$ } = anotherTranslator;
      `,
    },

    // 20. Object-format messages - valid destructuring
    {
      filename: testFilePath,
      code: `
        import { objectFormatStrings } from './fixtures/testStrings';
        const { welcomeMessage$, errorTitle$ } = objectFormatStrings;
      `,
    },

    // 21. Object-format messages - all valid keys
    {
      filename: testFilePath,
      code: `
        import { objectFormatStrings } from './fixtures/testStrings';
        const { welcomeMessage$, errorTitle$, successMessage$ } = objectFormatStrings;
      `,
    },

    // ========================================
    // Default Export Cases
    // ========================================

    // 22. Default import - valid destructuring
    {
      filename: testFilePath,
      code: `
        import defaultStrings from './fixtures/defaultExport';
        const { defaultMessage$, anotherMessage$ } = defaultStrings;
      `,
    },

    // ========================================
    // Re-export Pattern Cases
    // ========================================

    // 23. Re-export pattern - valid destructuring
    {
      filename: testFilePath,
      code: `
        import { reExportedStrings } from './fixtures/reExport';
        const { reExportedMessage$, anotherReExported$ } = reExportedStrings;
      `,
    },

    // ========================================
    // Cross-file Aliasing Cases
    // ========================================

    // 24. Cross-file import with aliasing
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { userLabel$: myUserLabel } = testStrings;
      `,
    },

    // ========================================
    // Object-of-Translators Pattern Cases
    // ========================================

    // 25. Object containing translator - direct member access
    {
      code: `
        const translators = {
          completed: createTranslator('NS', { validKey: 'msg' })
        };
        const { validKey$ } = translators.completed;
      `,
    },

    // 26. Object containing translator - two-step destructuring
    {
      code: `
        const translators = {
          completed: createTranslator('NS', { validKey: 'msg' })
        };
        const { completed } = translators;
        const { validKey$ } = completed;
      `,
    },

    // 27. Object with multiple translators - direct access
    {
      code: `
        const progressTranslators = {
          completed: createTranslator('NS1', { key1: 'a' }),
          inProgress: createTranslator('NS2', { key2: 'b' })
        };
        const { key1$ } = progressTranslators.completed;
        const { key2$ } = progressTranslators.inProgress;
      `,
    },

    // 28. Object with multiple translators - two-step
    {
      code: `
        const progressTranslators = {
          completed: createTranslator('NS1', { key1: 'a' }),
          inProgress: createTranslator('NS2', { key2: 'b' })
        };
        const { completed, inProgress } = progressTranslators;
        const { key1$ } = completed;
        const { key2$ } = inProgress;
      `,
    },

    // 29. Object with aliased extraction
    {
      code: `
        const translators = {
          main: createTranslator('NS', { validKey: 'msg' })
        };
        const { main: myTranslator } = translators;
        const { validKey$ } = myTranslator;
      `,
    },

    // ========================================
    // Import Resolution Failure Cases (should silently skip)
    // ========================================

    // 30. Import from non-existent file - should not error
    {
      filename: testFilePath,
      code: `
        import { nonExistent } from './fixtures/doesNotExist';
        const { anyKey$ } = nonExistent;
      `,
    },

    // 31. Import from malformed file - should not error (parse failure)
    {
      filename: testFilePath,
      code: `
        import { malformed } from './fixtures/malformed';
        const { anyKey$ } = malformed;
      `,
    },
  ],

  invalid: [
    // ========================================
    // Invalid Cases
    // ========================================

    // 1. Basic undefined key
    {
      code: `
        const translator = createTranslator('NS', { validKey: 'msg' });
        const { undefinedKey$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'undefinedKey$' does not exist in translator 'translator'. Available keys: validKey$",
          type: 'Property',
        },
      ],
    },

    // 2. Mix of valid and invalid keys
    {
      code: `
        const translator = createTranslator('NS', { validKey: 'msg' });
        const { validKey$, undefinedKey$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'undefinedKey$' does not exist in translator 'translator'. Available keys: validKey$",
          type: 'Property',
        },
      ],
    },

    // 3. Typo in key name
    {
      code: `
        const translator = createTranslator('NS', { userLabel: 'User' });
        const { usrLabel$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'usrLabel$' does not exist in translator 'translator'. Available keys: userLabel$",
          type: 'Property',
        },
      ],
    },

    // 4. Missing $ suffix
    {
      code: `
        const translator = createTranslator('NS', { key: 'msg' });
        const { key } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'key' from translator 'translator' should end with '$'. Did you mean 'key$'?",
          type: 'Property',
        },
      ],
    },

    // 5. Case sensitivity error
    {
      code: `
        const translator = createTranslator('NS', { myKey: 'msg' });
        const { MyKey$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'MyKey$' does not exist in translator 'translator'. Available keys: myKey$",
          type: 'Property',
        },
      ],
    },

    // 6. Empty messages object with attempted destructuring
    {
      code: `
        const translator = createTranslator('NS', {});
        const { anyKey$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'anyKey$' does not exist in translator 'translator'. Available keys: ",
          type: 'Property',
        },
      ],
    },

    // 7. Multiple undefined keys
    {
      code: `
        const translator = createTranslator('NS', { validKey: 'msg' });
        const { invalid1$, invalid2$, invalid3$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalid1$' does not exist in translator 'translator'. Available keys: validKey$",
          type: 'Property',
        },
        {
          message:
            "Destructured property 'invalid2$' does not exist in translator 'translator'. Available keys: validKey$",
          type: 'Property',
        },
        {
          message:
            "Destructured property 'invalid3$' does not exist in translator 'translator'. Available keys: validKey$",
          type: 'Property',
        },
      ],
    },

    // 8. Renamed destructuring with invalid key
    {
      code: `
        const translator = createTranslator('NS', { validKey: 'msg' });
        const { invalidKey$: myLabel } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'translator'. Available keys: validKey$",
          type: 'Property',
        },
      ],
    },

    // 9. Spread operator with invalid key
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a' });
        const { invalidKey$, ...rest } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'translator'. Available keys: key1$",
          type: 'Property',
        },
      ],
    },

    // 10. Wrong key from different translator
    {
      code: `
        const translator1 = createTranslator('NS1', { key1: 'a' });
        const translator2 = createTranslator('NS2', { key2: 'b' });
        const { key2$ } = translator1;
      `,
      errors: [
        {
          message:
            "Destructured property 'key2$' does not exist in translator 'translator1'. Available keys: key1$",
          type: 'Property',
        },
      ],
    },

    // 11. Exported translator with invalid key
    {
      code: `
        export const translator = createTranslator('NS', { validKey: 'msg' });
        const { invalidKey$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'translator'. Available keys: validKey$",
          type: 'Property',
        },
      ],
    },

    // 12. Complex object format with invalid key
    {
      code: `
        const translator = createTranslator('NS', {
          userLabel: { message: 'User', context: 'Label for user' },
          adminLabel: { message: 'Admin' },
        });
        const { userLabel$, invalidLabel$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidLabel$' does not exist in translator 'translator'. Available keys: adminLabel$, userLabel$",
          type: 'Property',
        },
      ],
    },

    // 13. Destructuring in nested scope
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a' });
        function useTranslator() {
          const { invalidKey$ } = translator;
        }
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'translator'. Available keys: key1$",
          type: 'Property',
        },
      ],
    },

    // 14. Missing $ with multiple keys
    {
      code: `
        const translator = createTranslator('NS', { key1: 'a', key2: 'b' });
        const { key1, key2$ } = translator;
      `,
      errors: [
        {
          message:
            "Destructured property 'key1' from translator 'translator' should end with '$'. Did you mean 'key1$'?",
          type: 'Property',
        },
      ],
    },

    // ========================================
    // Cross-file Import Invalid Cases
    // ========================================

    // 15. Import and destructure invalid key
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { invalidKey$ } = testStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'testStrings'. Available keys: adminLabel$, coachLabel$, goBackAction$, learnerLabel$, userLabel$",
          type: 'Property',
        },
      ],
    },

    // 16. Import and typo in key name
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { usrLabel$ } = testStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'usrLabel$' does not exist in translator 'testStrings'. Available keys: adminLabel$, coachLabel$, goBackAction$, learnerLabel$, userLabel$",
          type: 'Property',
        },
      ],
    },

    // 17. Import and mix valid and invalid keys
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { userLabel$, invalidLabel$ } = testStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidLabel$' does not exist in translator 'testStrings'. Available keys: adminLabel$, coachLabel$, goBackAction$, learnerLabel$, userLabel$",
          type: 'Property',
        },
      ],
    },

    // 18. Import from another translator with invalid key
    {
      filename: testFilePath,
      code: `
        import { anotherTranslator } from './fixtures/testStrings';
        const { invalidAction$ } = anotherTranslator;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidAction$' does not exist in translator 'anotherTranslator'. Available keys: cancelAction$, deleteAction$, saveAction$",
          type: 'Property',
        },
      ],
    },

    // 19. Import missing $ suffix
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { userLabel } = testStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'userLabel' from translator 'testStrings' should end with '$'. Did you mean 'userLabel$'?",
          type: 'Property',
        },
      ],
    },

    // ========================================
    // Object-format Invalid Cases (Testing Issue #1 fix)
    // ========================================

    // 20. Object-format - trying to destructure nested 'message' property
    {
      filename: testFilePath,
      code: `
        import { objectFormatStrings } from './fixtures/testStrings';
        const { message$ } = objectFormatStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'message$' does not exist in translator 'objectFormatStrings'. Available keys: errorTitle$, successMessage$, welcomeMessage$",
          type: 'Property',
        },
      ],
    },

    // 21. Object-format - trying to destructure nested 'context' property
    {
      filename: testFilePath,
      code: `
        import { objectFormatStrings } from './fixtures/testStrings';
        const { context$ } = objectFormatStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'context$' does not exist in translator 'objectFormatStrings'. Available keys: errorTitle$, successMessage$, welcomeMessage$",
          type: 'Property',
        },
      ],
    },

    // 22. Object-format - invalid key with object-format translator
    {
      filename: testFilePath,
      code: `
        import { objectFormatStrings } from './fixtures/testStrings';
        const { invalidKey$ } = objectFormatStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'objectFormatStrings'. Available keys: errorTitle$, successMessage$, welcomeMessage$",
          type: 'Property',
        },
      ],
    },

    // 23. Object-format - mix of valid and nested property
    {
      filename: testFilePath,
      code: `
        import { objectFormatStrings } from './fixtures/testStrings';
        const { welcomeMessage$, message$ } = objectFormatStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'message$' does not exist in translator 'objectFormatStrings'. Available keys: errorTitle$, successMessage$, welcomeMessage$",
          type: 'Property',
        },
      ],
    },

    // ========================================
    // Default Export Invalid Cases
    // ========================================

    // 24. Default import - invalid key
    {
      filename: testFilePath,
      code: `
        import defaultStrings from './fixtures/defaultExport';
        const { invalidKey$ } = defaultStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'defaultStrings'. Available keys: anotherMessage$, defaultMessage$",
          type: 'Property',
        },
      ],
    },

    // ========================================
    // Re-export Invalid Cases
    // ========================================

    // 25. Re-export - invalid key
    {
      filename: testFilePath,
      code: `
        import { reExportedStrings } from './fixtures/reExport';
        const { invalidKey$ } = reExportedStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'reExportedStrings'. Available keys: anotherReExported$, reExportedMessage$",
          type: 'Property',
        },
      ],
    },

    // ========================================
    // Cross-file Aliasing Invalid Cases
    // ========================================

    // 26. Cross-file aliasing - invalid key
    {
      filename: testFilePath,
      code: `
        import { testStrings } from './fixtures/testStrings';
        const { invalidKey$: myLabel } = testStrings;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'testStrings'. Available keys: adminLabel$, coachLabel$, goBackAction$, learnerLabel$, userLabel$",
          type: 'Property',
        },
      ],
    },

    // ========================================
    // Object-of-Translators Invalid Cases
    // ========================================

    // 27. Object containing translator - direct member access with invalid key
    {
      code: `
        const translators = {
          completed: createTranslator('NS', { validKey: 'msg' })
        };
        const { invalidKey$ } = translators.completed;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'translators.completed'. Available keys: validKey$",
          type: 'Property',
        },
      ],
    },

    // 28. Object containing translator - two-step with invalid key
    {
      code: `
        const translators = {
          completed: createTranslator('NS', { validKey: 'msg' })
        };
        const { completed } = translators;
        const { invalidKey$ } = completed;
      `,
      errors: [
        {
          message:
            "Destructured property 'invalidKey$' does not exist in translator 'completed'. Available keys: validKey$",
          type: 'Property',
        },
      ],
    },

    // 29. Object with multiple translators - wrong property access
    {
      code: `
        const progressTranslators = {
          completed: createTranslator('NS1', { key1: 'a' }),
          inProgress: createTranslator('NS2', { key2: 'b' })
        };
        const { key2$ } = progressTranslators.completed;
      `,
      errors: [
        {
          message:
            "Destructured property 'key2$' does not exist in translator 'progressTranslators.completed'. Available keys: key1$",
          type: 'Property',
        },
      ],
    },

    // 30. Object with multiple translators - two-step wrong extraction
    {
      code: `
        const progressTranslators = {
          completed: createTranslator('NS1', { key1: 'a' }),
          inProgress: createTranslator('NS2', { key2: 'b' })
        };
        const { completed } = progressTranslators;
        const { key2$ } = completed;
      `,
      errors: [
        {
          message:
            "Destructured property 'key2$' does not exist in translator 'completed'. Available keys: key1$",
          type: 'Property',
        },
      ],
    },
  ],
});
