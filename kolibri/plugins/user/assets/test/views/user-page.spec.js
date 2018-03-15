/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import { mount } from '@vue/test-utils';
import UserPage from '../../src/views/index.vue';
import makeStore from '../util/makeStore';

function makeWrapper() {
  return mount(UserPage, {
    store: makeStore(),
  });
}

describe('user index page component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    assert(wrapper.exists());
  });
});
