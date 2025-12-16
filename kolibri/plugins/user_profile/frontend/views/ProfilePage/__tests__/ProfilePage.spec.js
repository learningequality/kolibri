import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { mount, RouterLinkStub, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import ProfilePage from '../index';
import makeStore from '../../../__tests__/utils/makeStore';
import useOnMyOwnSetup, {
  // eslint-disable-next-line import/named
  useOnMyOwnSetupMock,
} from '../../../composables/useOnMyOwnSetup';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line

jest.mock('kolibri-common/apiResources/FacilityUserResource');
jest.mock('../../../composables/useOnMyOwnSetup');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/composables/useFacilities');

FacilityUserResource.fetchModel = jest.fn().mockResolvedValue({});

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter();
router.getRoute = () => {};

function makeWrapper() {
  const store = makeStore();
  useFacilities.mockImplementation(() =>
    useFacilitiesMock({
      facilityConfig: { learner_can_edit_password: true },
    }),
  );
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
