import { mount } from '@vue/test-utils';
import ProfilePage from '../../src/views/ProfilePage';
import makeStore from '../makeStore';

ProfilePage.methods.fetchPoints = () => {};

function makeWrapper() {
  const store = makeStore();
  store.commit('profile/SET_STATE', {
    passwordState: {
      modal: false,
    },
  });
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
