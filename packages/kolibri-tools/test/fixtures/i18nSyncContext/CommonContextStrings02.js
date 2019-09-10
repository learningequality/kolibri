import { createTranslator } from 'kolibri.utils.i18n';

/**
 * This file defines some strings WITH initial context in place.
 */

const contextStrings = createTranslator('CommonContextStrings02', {
  userLabel: {
    message: 'User',
    context: 'Label for the user',
  },
});

const anotherStrings = createTranslator('CommonContextStrings03', {
  anotherLabel: 'Another',
});

const contextStringsMixin = {
  methods: {
    contextString(key, args) {
      return contextStrings.$tr(key, args);
    },
  },
};

export { anotherStrings, contextStrings, contextStringsMixin };
