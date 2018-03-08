/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import { mount } from '@vue/test-utils';
import ProfilePage from '../../src/views/profile-page';
import makeStore from '../util/makeStore';

ProfilePage.vuex.actions.fetchPoints = () => {};

function makeWrapper() {
  const store = makeStore();
  store.state.pageState.passwordState = {
    modal: false,
  };
  return mount(ProfilePage, {
    store,
  });
}

describe('profilePage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    assert(wrapper.isVueComponent);
  });
});
