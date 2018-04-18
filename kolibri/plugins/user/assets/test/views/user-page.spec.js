/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
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
    expect(wrapper.exists()).to.be.true;
  });
});
