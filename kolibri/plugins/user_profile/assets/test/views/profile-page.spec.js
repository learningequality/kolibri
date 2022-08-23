import { FacilityUserResource } from 'kolibri.resources';
import { mount, RouterLinkStub, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ProfilePage from '../../src/views/ProfilePage';
import makeStore from '../makeStore';
import useOnMyOwnSetup, {
  // eslint-disable-next-line import/named
  useOnMyOwnSetupMock,
} from '../../src/composables/useOnMyOwnSetup';

jest.mock('kolibri.resources');
jest.mock('../../src/composables/useOnMyOwnSetup');

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
  beforeAll(() => {
    useOnMyOwnSetup.mockImplementation(() => useOnMyOwnSetupMock({ onMyOwnSetup: true }));
  });

  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toEqual(true);
  });
});
