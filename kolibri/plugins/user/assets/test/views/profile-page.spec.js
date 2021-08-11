import { FacilityUserResource } from 'kolibri.resources';
import { mount, RouterLinkStub, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ProfilePage from '../../src/views/ProfilePage';
import makeStore from '../makeStore';

jest.mock('kolibri.resources');

FacilityUserResource.fetchModel = jest.fn().mockResolvedValue({});

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter();
router.getRoute = () => {};

function makeWrapper() {
  const store = makeStore();
  return mount(ProfilePage, {
    store,
    localVue,
    router,
    stubs: {
      RouterLink: RouterLinkStub,
      AppBar: {
        name: 'AppBar',
        template: '<div></div>',
      },
    },
  });
}

describe('profilePage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toEqual(true);
  });
});
