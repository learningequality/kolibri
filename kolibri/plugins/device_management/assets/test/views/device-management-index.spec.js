/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import urls from 'kolibri.urls';
import Index from '../../src/views/index.vue';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

urls.freespace = () => '';

function makeStore() {
  return makeAvailableChannelsPageStore();
}

function makeWrapper(store) {
  const router = new VueRouter();
  const wrapper = mount(Index, {
    store: store || makeStore,
    router,
  });
  const els = {
    coreBase: () => wrapper.find({ name: 'coreBase' }),
  };
  return { wrapper, els };
}

describe('device management index page', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
  });

  it('core-base is immersive when at the SELECT_CONTENT page', () => {
    store.dispatch('SET_PAGE_NAME', 'SELECT_CONTENT');
    const { els } = makeWrapper(store);
    expect(els.coreBase().props().immersivePage).to.be.true;
  });

  it('core-base is immersive when at the AVAILABLE_CHANNELS page', () => {
    store.dispatch('SET_PAGE_NAME', 'AVAILABLE_CHANNELS');
    const { els } = makeWrapper(store);
    expect(els.coreBase().props().immersivePage).to.be.true;
  });
});
