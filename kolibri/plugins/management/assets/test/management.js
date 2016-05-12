/* eslint-env mocha */
const Management = require('vue!../src/main.vue');
const assert = require('assert');

describe('The management module', () => {
  it('defines a Management vue', () => {
    // A sanity check
    assert(Management !== undefined);
  });
});
