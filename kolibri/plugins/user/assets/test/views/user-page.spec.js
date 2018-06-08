/* eslint-env mocha */
import Vue from 'vue'; // eslint-disable-line
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
    expect(wrapper.exists()).toEqual(true);
  });
});
