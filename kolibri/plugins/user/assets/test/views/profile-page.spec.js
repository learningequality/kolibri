import { mount } from '@vue/test-utils';
import ProfilePage from '../../src/views/profile-page';
import makeStore from '../makeStore';

ProfilePage.methods.fetchPoints = () => {};
ProfilePage.mixins = [];

function makeWrapper() {
  const store = makeStore();
  store.state.pageState.passwordState = {};
  store.commit('SET_PROFILE_PASSWORD_MODAL', false);
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
