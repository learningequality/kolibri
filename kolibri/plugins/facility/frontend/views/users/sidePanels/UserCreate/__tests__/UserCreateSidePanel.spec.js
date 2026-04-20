import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import useFacility from 'kolibri-common/composables/useFacility';
import { useFacilityMock } from 'kolibri-common/composables/__mocks__/useFacility';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
import UserCreateSidePanel from '../index.vue';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  fetchCollection: jest.fn(),
  saveModel: jest.fn(),
}));
jest.mock('kolibri-common/apiResources/RoleResource', () => ({
  saveModel: jest.fn(),
  saveCollection: jest.fn(),
}));
jest.mock('kolibri-common/apiResources/MembershipResource', () => ({
  saveCollection: jest.fn(),
}));
jest.mock('kolibri/store', () => ({
  state: {
    userManagement: { facilityUsers: [] },
    route: { params: { facility_id: 'test-facility-id' }, query: {} },
  },
}));
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(() => ({ params: { facility_id: 'test-facility-id' } })),
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
  onBeforeRouteLeave: jest.fn(),
}));

const PICTURE_PASSWORD_SETTINGS = { icon_style: 'colorful', show_icon_text: false };

function makeFacilityConfig({
  picturePasswordSettings = null,
  learnerCanLoginWithNoPassword = false,
} = {}) {
  return ref({
    picture_password_settings: picturePasswordSettings,
    learner_can_login_with_no_password: learnerCanLoginWithNoPassword,
    extra_fields: null,
  });
}

function renderComponent({
  picturePasswordSettings = null,
  picturePasswordsExhausted = false,
  learnerCanLoginWithNoPassword = false,
} = {}) {
  useFacility.mockImplementation(() =>
    useFacilityMock({
      facilityConfig: makeFacilityConfig({
        picturePasswordSettings,
        learnerCanLoginWithNoPassword,
      }),
      selectedFacility: ref({
        picture_passwords_exhausted: picturePasswordsExhausted,
      }),
      setFacilityId: jest.fn().mockResolvedValue(undefined),
    }),
  );

  const onChange = jest.fn();
  const result = render(UserCreateSidePanel, {
    props: {
      classes: [],
      onChange,
    },
  });
  return { ...result, onChange };
}
const waitForFormReady = () =>
  waitFor(() => expect(screen.getByText(coreStrings.userTypeLabel$())).toBeInTheDocument());

async function selectUserType(user, optionText) {
  const trigger = screen.getByText(coreStrings.userTypeLabel$()).closest('.ui-select-label');
  await user.click(trigger);
  await user.click(await screen.findByText(optionText));
}

describe('UserCreateSidePanel — picture password behavior', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    expect(() => renderComponent()).not.toThrow();
  });

  describe('picture password informational message', () => {
    it('is not shown when picture login is disabled', () => {
      renderComponent({ picturePasswordSettings: null });
      expect(screen.queryByTestId('picture-password-info')).not.toBeInTheDocument();
    });

    it('is shown when picture login is enabled and limit is not reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: false,
      });

      await waitFor(() => {
        expect(screen.getByTestId('picture-password-info')).toBeInTheDocument();
      });
    });

    it('is shown when learner limit is reached and no user type is selected', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      // Wait for loading to finish — the "Learn more" button confirms the limit state is rendered
      await waitFor(() => {
        expect(screen.getByTestId('learn-more-button')).toBeInTheDocument();
      });
      expect(screen.getByTestId('picture-password-info')).toBeInTheDocument();
    });

    it('is not shown when a non-Learner role is selected', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: false,
      });

      // No user type selected by default — info is visible
      await waitFor(() => {
        expect(screen.getByTestId('picture-password-info')).toBeInTheDocument();
      });

      await selectUserType(user, coreStrings.coachLabel$());

      await waitFor(() => {
        expect(screen.queryByTestId('picture-password-info')).not.toBeInTheDocument();
      });
    });
  });

  describe('learner limit reached state', () => {
    it('shows the learner limit message with a "Learn more" button when limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId('learn-more-button')).toBeInTheDocument();
      });
    });

    it('does not show the learner limit message when under the limit', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: false,
      });

      await waitForFormReady();
      expect(screen.queryByTestId('learn-more-button')).not.toBeInTheDocument();
    });

    it('leaves the user type dropdown empty when learner limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      await waitForFormReady();
      // No type pre-selected, so the coach radio group should not be visible
      expect(screen.queryByTestId('coach-type-selector')).not.toBeInTheDocument();
    });

    it('Learner option is disabled and Coach/Admin are not when limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      await waitForFormReady();

      const trigger = screen.getByText(coreStrings.userTypeLabel$()).closest('.ui-select-label');
      await user.click(trigger);

      const learnerOption = (await screen.findByText(coreStrings.learnerLabel$())).closest('li');
      const coachOption = screen.getByText(coreStrings.coachLabel$()).closest('li');
      const adminOption = screen.getByText(coreStrings.adminLabel$()).closest('li');

      expect(learnerOption).toHaveClass('is-disabled');
      expect(coachOption).not.toHaveClass('is-disabled');
      expect(adminOption).not.toHaveClass('is-disabled');
    });

    it('opens the learner limit modal when the "Learn more" button is clicked', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId('learn-more-button')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('learn-more-button'));

      await waitFor(() => {
        expect(screen.getByTestId('context-paragraph')).toBeInTheDocument();
      });
    });
  });
});

describe('UserCreateSidePanel — user creation form behavior', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    expect(() => renderComponent()).not.toThrow();
  });

  describe('password field visibility', () => {
    it('is shown when the facility requires a password', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(coreStrings.passwordLabel$())).toBeInTheDocument();
      });
    });

    it('is hidden for learners when the facility allows no-password login', async () => {
      renderComponent({ learnerCanLoginWithNoPassword: true });

      await waitForFormReady();
      await selectUserType(user, coreStrings.learnerLabel$());

      await waitFor(() => {
        expect(screen.queryByLabelText(coreStrings.passwordLabel$())).not.toBeInTheDocument();
      });
    });

    it('is shown for coaches even when the facility allows no-password login', async () => {
      renderComponent({ learnerCanLoginWithNoPassword: true });

      await waitForFormReady();
      await selectUserType(user, coreStrings.coachLabel$());

      await waitFor(() => {
        expect(screen.getByLabelText(coreStrings.passwordLabel$())).toBeInTheDocument();
      });
    });
  });

  describe('coach type selection', () => {
    it('shows the class/facility coach radio group when Coach is selected', async () => {
      renderComponent();

      await waitForFormReady();
      await selectUserType(user, coreStrings.coachLabel$());

      await waitFor(() => {
        expect(screen.getByTestId('coach-type-selector')).toBeInTheDocument();
      });
    });

    it('does not show the coach radio group when Learner is selected', async () => {
      renderComponent();

      await waitForFormReady();
      await selectUserType(user, coreStrings.learnerLabel$());

      await waitFor(() => {
        expect(screen.queryByTestId('coach-type-selector')).not.toBeInTheDocument();
      });
    });

    it('does not show the coach radio group when Admin is selected', async () => {
      renderComponent();

      await waitForFormReady();
      await selectUserType(user, coreStrings.adminLabel$());

      await waitFor(() => {
        expect(screen.queryByTestId('coach-type-selector')).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('does not call FacilityUserResource when the form is submitted with empty fields', async () => {
      FacilityUserResource.saveModel.mockResolvedValue({ id: 'new-user-id', facility: 'fac-1' });
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: coreStrings.saveAndClose$() }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: coreStrings.saveAndClose$() }));

      expect(FacilityUserResource.saveModel).not.toHaveBeenCalled();
    });

    it('does not call FacilityUserResource when "Save and add another" is clicked with empty fields', async () => {
      FacilityUserResource.saveModel.mockResolvedValue({ id: 'new-user-id', facility: 'fac-1' });
      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: bulkUserManagementStrings.saveAndAddAnother$() }),
        ).toBeInTheDocument();
      });
      await user.click(
        screen.getByRole('button', { name: bulkUserManagementStrings.saveAndAddAnother$() }),
      );

      expect(FacilityUserResource.saveModel).not.toHaveBeenCalled();
    });
  });
});
