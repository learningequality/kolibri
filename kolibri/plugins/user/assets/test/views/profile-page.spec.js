import { mount, RouterLinkStub } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ProfilePage from '../../src/views/ProfilePage';
import makeStore from '../makeStore';

ProfilePage.methods.fetchPoints = () => {};
ProfilePage.methods.fetchFacilityUser = () => {};

const router = new VueRouter();
router.getRoute = () => {};

function makeWrapper() {
  const store = makeStore();
  return mount(ProfilePage, {
    store,
    router,
    stubs: {
      RouterLink: RouterLinkStub,
    },
  });
}

describe('profilePage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.isVueInstance()).toEqual(true);
  });
});
