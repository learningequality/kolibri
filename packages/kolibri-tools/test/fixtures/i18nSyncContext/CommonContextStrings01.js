/* eslint-disable no-unused-vars */
import { createTranslator } from 'kolibri.utils.i18n';

/**
 * This file defines some strings without initial context in place.
 */

const contextStrings = createTranslator('CommonContextStrings01', {
  userLabel: 'User',
});

// A meaningless node to ensure is$trs() works properly.

const $trs = () => {
  return null;
};

const contextStringsMixin = {
  methods: {
    contextString(key, args) {
      return contextStrings.$tr(key, args);
    },
  },
};

export { contextStrings, contextStringsMixin };
