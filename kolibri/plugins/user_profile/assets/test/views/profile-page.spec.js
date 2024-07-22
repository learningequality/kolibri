import { FacilityUserResource } from 'kolibri.resources';
import { mount, RouterLinkStub, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri.coreVue.composables.useUser';
import ProfilePage from '../../src/views/ProfilePage';
import makeStore from '../makeStore';
import useOnMyOwnSetup, {
  // eslint-disable-next-line import/named
  useOnMyOwnSetupMock,
} from '../../src/composables/useOnMyOwnSetup';

jest.mock('kolibri.resources');
jest.mock('../../src/composables/useOnMyOwnSetup');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri.coreVue.composables.useUser');

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
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
    useUser.mockImplementation(() => useUserMock());
  });

  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toEqual(true);
  });
});
