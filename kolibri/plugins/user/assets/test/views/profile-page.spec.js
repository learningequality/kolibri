/* eslint-env mocha */
import Vue from 'vue'; // eslint-disable-line
import { mount } from '@vue/test-utils';
import ProfilePage from '../../src/views/profile-page';
import makeStore from '../util/makeStore';

ProfilePage.vuex.actions.fetchPoints = () => {};

function makeWrapper() {
  const store = makeStore();
  store.state.pageState.passwordState = {};
  store.dispatch('SET_PROFILE_PASSWORD_MODAL', false);
  return mount(ProfilePage, {
    store,
  });
}

describe('profilePage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.isVueInstance()).toEqual(true);
  });
});
