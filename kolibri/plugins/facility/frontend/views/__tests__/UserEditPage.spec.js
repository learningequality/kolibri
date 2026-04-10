import { render, screen, waitFor, within, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import { UserKinds } from 'kolibri/constants';
import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import makeStore from '../../__tests__/utils/makeStore';
import UserEditPage from '../UserEditPage.vue';
import { PageNames } from '../../constants';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri-common/apiResources/FacilityUserResource');

const facilityId = 'test-facility-id';

const mockUser = {
  id: 'current-user-id',
  username: 'testuser',
  full_name: 'Test User',
  id_number: '',
  gender: '',
  birth_year: '',
  extra_demographics: null,
  picture_password: '1.2.3',
  facility: facilityId,
  roles: [],
  member_of: [],
};

function createUser(kind = UserKinds.LEARNER, overrides = {}) {
  const roles = [];

  if (kind !== UserKinds.LEARNER) {
    roles.push({
      kind,
      collection: facilityId,
    });
  }

  return {
    ...mockUser,
    ...overrides,
    roles,
  };
}

function createRouter() {
  return new VueRouter({
    routes: [
      {
        path: '/facility/users/:id/edit/',
        name: PageNames.USER_EDIT_PAGE,
        params: { id: 'current-user-id' },
        component: UserEditPage,
      },
      {
        name: PageNames.USER_MGMT_PAGE,
        path: '/:facility_id?/users/',
      },
    ],
  });
}

async function renderPage({
  mockFacility = {},
  mockFacilityConfig = {},
  mockUserFetch = null,
  currentUserId = 'current-user-id',
} = {}) {
  useFacility.mockImplementation(() =>
    useFacilityMock({
      ...mockFacility,
      facilityId,
      facilityConfig: ref(mockFacilityConfig),
    }),
  );

  const user = mockUserFetch || createUser();
  useUser.mockImplementation(() =>
    useUserMock({
      currentUserId,
      ...user,
      isAppContext: false,
    }),
  );

  FacilityUserResource.fetchModel.mockResolvedValue(user);

  const router = createRouter();
  const store = makeStore();

  await router.push({ name: PageNames.USER_EDIT_PAGE, params: { id: 'test-user-id' } });

  const utils = render(UserEditPage, {
    router,
    store,
  });

  return { ...utils, router, store };
}

describe('UserEditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('picture password section', () => {
    it('does not show picture password section when feature is disabled', async () => {
      await renderPage();

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).queryByTestId('picture-password-section')).not.toBeInTheDocument();
      });
    });

    it('does not show picture password section for non-learners', async () => {
      await renderPage({
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
        mockUserFetch: createUser(UserKinds.ADMIN),
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).queryByTestId('picture-password-section')).not.toBeInTheDocument();
      });
    });

    it('does not show picture password section for super-users', async () => {
      await renderPage({
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
        mockUserFetch: createUser(UserKinds.SUPERUSER, { is_superuser: true }),
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).queryByTestId('picture-password-section')).not.toBeInTheDocument();
      });
    });

    it('does not show picture password section when user has no picture password', async () => {
      await renderPage({
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
        mockUserFetch: createUser(UserKinds.LEARNER, { picture_password: null }),
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).queryByTestId('picture-password-section')).not.toBeInTheDocument();
      });
    });

    it('shows picture password section for learners with picture passwords enabled', async () => {
      await renderPage({
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).getByTestId('picture-password-section')).toBeInTheDocument();
      });
    });
  });

  describe('learner role option disabling', () => {
    it('does not disable learner option when picture passwords are not exhausted', async () => {
      await renderPage({
        mockUserFetch: createUser(UserKinds.ADMIN),
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).getByTestId('user-type')).not.toHaveClass('learner-role-disabled');
      });
    });

    it('does not disable learner option for existing learners', async () => {
      await renderPage({
        mockFacility: {
          selectedFacility: ref({
            picture_passwords_exhausted: true,
          }),
        },
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).getByTestId('user-type')).not.toHaveClass('learner-role-disabled');
      });
    });

    it('disables learner option when passwords exhausted and editing non-learner', async () => {
      await renderPage({
        mockFacility: {
          selectedFacility: ref({
            picture_passwords_exhausted: true,
          }),
        },
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
        mockUserFetch: createUser(UserKinds.ADMIN),
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).getByTestId('user-type')).toHaveClass('learner-role-disabled');
      });
    });

    it('shows learner limit message when learner option is disabled', async () => {
      await renderPage({
        mockFacility: {
          selectedFacility: ref({
            picture_passwords_exhausted: true,
          }),
        },
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
        mockUserFetch: createUser(UserKinds.ADMIN),
      });

      await waitFor(() => {
        const form = screen.getByTestId('form');
        expect(within(form).getByTestId('learner-limit-message')).toBeInTheDocument();
      });
    });
  });

  describe('LearnerLimitReachedModal', () => {
    it('does not show modal by default', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.queryByTestId('learner-limit-modal')).not.toBeInTheDocument();
      });
    });

    it('opens modal when trying to save as learner with disabled option', async () => {
      await renderPage({
        mockFacility: {
          selectedFacility: ref({
            picture_passwords_exhausted: true,
          }),
        },
        mockFacilityConfig: {
          picture_password_settings: {
            icon_style: PicturePasswordIconStyle.COLORFUL,
          },
        },
        mockUserFetch: createUser(UserKinds.ADMIN),
      });

      let triggerButton;

      await waitFor(() => {
        triggerButton = screen.getByTestId('learner-limit-modal-trigger');
        expect(triggerButton).toBeInTheDocument();
      });

      await fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId('learner-limit-modal')).toBeInTheDocument();
      });
    });
  });
});
