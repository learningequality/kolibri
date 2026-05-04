import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { mount, RouterLinkStub, createLocalVue } from '@vue/test-utils';
import { render, screen } from '@testing-library/vue';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { UserKinds } from 'kolibri/constants';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import ProfilePage from '../index';
import makeStore from '../../../__tests__/utils/makeStore';
import useOnMyOwnSetup, {
  // eslint-disable-next-line import-x/named
  useOnMyOwnSetupMock,
} from '../../../composables/useOnMyOwnSetup';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line

jest.mock('kolibri-common/apiResources/FacilityUserResource');
jest.mock('../../../composables/useOnMyOwnSetup');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/composables/useFacilities');
jest.mock('kolibri-common/composables/useFacility');

const { fullNameLabel$ } = coreStrings;

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

describe('picture password row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnMyOwnSetup.mockImplementation(() => useOnMyOwnSetupMock({ onMyOwnSetup: false }));
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: false }));
    useFacilities.mockImplementation(() => useFacilitiesMock({ facilities: ref([]) }));
  });

  async function renderProfile({
    userKind = UserKinds.LEARNER,
    picturePasswordSettings = null,
    picturePassword = null,
  } = {}) {
    useUser.mockImplementation(() =>
      useUserMock({
        userKind,
        isLearner: userKind === UserKinds.LEARNER,
        isCoach: userKind === UserKinds.COACH,
        isAdmin: userKind === UserKinds.ADMIN || userKind === UserKinds.SUPERUSER,
        isSuperuser: userKind === UserKinds.SUPERUSER,
      }),
    );
    useFacility.mockImplementation(() =>
      useFacilityMock({
        facilityConfig: ref({
          picture_password_settings: picturePasswordSettings,
          learner_can_edit_password: false,
        }),
      }),
    );
    FacilityUserResource.fetchModel = jest
      .fn()
      .mockResolvedValue({ picture_password: picturePassword });

    const localRouter = new VueRouter();
    localRouter.getRoute = () => '/';

    return render(ProfilePage, {
      store: makeStore(),
      routes: localRouter,
    });
  }

  it('renders the picture password display for a learner with a picture_password', async () => {
    await renderProfile({
      userKind: UserKinds.LEARNER,
      picturePasswordSettings: {
        icon_style: PicturePasswordIconStyle.COLORFUL,
        show_icon_text: false,
      },
      picturePassword: '3.7.12',
    });

    expect(await screen.findByTestId('picture-password-display')).toBeInTheDocument();
    // Three icons, no labels — per the AC.
    const icons = screen.queryAllByTestId(/^picture-password-icon-/);
    expect(icons).toHaveLength(3);
  });

  it('renders the empty-value placeholder when the learner has no picture_password', async () => {
    await renderProfile({
      userKind: UserKinds.LEARNER,
      picturePasswordSettings: {
        icon_style: PicturePasswordIconStyle.COLORFUL,
        show_icon_text: false,
      },
      picturePassword: null,
    });

    expect(await screen.findByTestId('picture-password-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('picture-password-display')).not.toBeInTheDocument();
  });

  it('omits the picture password row when picture_password_settings is null', async () => {
    await renderProfile({
      userKind: UserKinds.LEARNER,
      picturePasswordSettings: null,
      picturePassword: null,
    });

    // Wait for the page to actually render before negative-asserting.
    await screen.findByText(fullNameLabel$());

    expect(screen.queryByTestId('picture-password-display')).not.toBeInTheDocument();
    expect(screen.queryByTestId('picture-password-empty')).not.toBeInTheDocument();
  });

  it('omits the picture password row for a coach in a picture-login facility', async () => {
    await renderProfile({
      userKind: UserKinds.COACH,
      picturePasswordSettings: {
        icon_style: PicturePasswordIconStyle.COLORFUL,
        show_icon_text: false,
      },
      picturePassword: null,
    });

    await screen.findByText(fullNameLabel$());

    expect(screen.queryByTestId('picture-password-display')).not.toBeInTheDocument();
    expect(screen.queryByTestId('picture-password-empty')).not.toBeInTheDocument();
  });
});
