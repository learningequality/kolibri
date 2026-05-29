import { render, screen, waitFor, fireEvent, within } from '@testing-library/vue';
import { ref, computed } from 'vue';
import useFacility from 'kolibri-common/composables/useFacility';
import { useFacilityMock } from 'kolibri-common/composables/__mocks__/useFacility';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import RoleResource from 'kolibri-common/apiResources/RoleResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import { DemographicConstants, UserKinds } from 'kolibri/constants';
import UserCreateSidePanel from '../index.vue';

const { NOT_SPECIFIED } = DemographicConstants;

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri-common/apiResources/FacilityUserResource');
jest.mock('kolibri-common/apiResources/RoleResource');
jest.mock('kolibri-common/apiResources/MembershipResource');
jest.mock('kolibri/store', () => ({
  state: { userManagement: { facilityUsers: [] } },
}));
jest.mock('vue-router/composables', () => ({
  useRoute: () => ({ params: { facility_id: 'test-facility-id' } }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  onBeforeRouteLeave: jest.fn(),
}));

const PICTURE_PASSWORD_SETTINGS = { icon_style: 'colorful', show_icon_text: false };

function setup({
  pictureLogin = false,
  exhausted = false,
  learnerCanLoginWithNoPassword = false,
  pictureLoginFeatureEnabled = true,
} = {}) {
  useFacility.mockImplementation(() =>
    useFacilityMock({
      facilityConfig: ref({
        picture_password_settings: pictureLogin ? PICTURE_PASSWORD_SETTINGS : null,
        learner_can_login_with_no_password: learnerCanLoginWithNoPassword,
        extra_fields: null,
      }),
      selectedFacility: ref({ picture_passwords_exhausted: exhausted }),
      isPictureLoginFeatureEnabled: computed(() => pictureLoginFeatureEnabled),
      setFacilityId: jest.fn().mockResolvedValue(undefined),
    }),
  );
  return render(UserCreateSidePanel, {
    props: { classes: [], onChange: jest.fn() },
  });
}

const waitForFormReady = () =>
  waitFor(() => expect(screen.getByText(coreStrings.userTypeLabel$())).toBeVisible());

async function selectKind(label) {
  const trigger = screen.getByText(coreStrings.userTypeLabel$()).closest('.ui-select-label');
  await fireEvent.click(trigger);
  const optionsList = await waitFor(() => {
    const list = document.querySelector('.ui-select-options');
    if (!list) {
      throw new Error('options list not open');
    }
    return list;
  });
  await fireEvent.click(within(optionsList).getByText(label));
}

async function fillRequired() {
  await fireEvent.update(screen.getByLabelText(coreStrings.fullNameLabel$()), 'Test User');
  await fireEvent.update(screen.getByLabelText(coreStrings.usernameLabel$()), 'testuser');
}

async function setPassword(value) {
  const fields = screen.getAllByLabelText(coreStrings.passwordLabel$(), { exact: false });
  await fireEvent.update(fields[0], value);
  await fireEvent.update(fields[fields.length - 1], value);
}

const saveAndCloseButton = () => screen.getByRole('button', { name: coreStrings.saveAndClose$() });
const saveAndAddAnotherButton = () =>
  screen.getByRole('button', { name: bulkUserManagementStrings.saveAndAddAnother$() });

describe('UserCreateSidePanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('shows the password input when picture login is disabled', async () => {
      setup();
      await waitForFormReady();
      expect(screen.getByLabelText(coreStrings.passwordLabel$())).toHaveValue('');
      expect(screen.queryByTestId('picture-password-info')).not.toBeInTheDocument();
    });

    it('hides the password input and shows the picture password info when picture login is enabled', async () => {
      setup({ pictureLogin: true });
      await waitForFormReady();
      expect(screen.queryByLabelText(coreStrings.passwordLabel$())).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: picturePasswordStrings.signingInHeading$() }),
      ).toBeVisible();
      expect(
        screen.getByText(picturePasswordStrings.picturePasswordWillBeAssigned$()),
      ).toBeVisible();
    });

    it('hides the password input for learners when learner_can_login_with_no_password is true', async () => {
      setup({ learnerCanLoginWithNoPassword: true });
      await waitForFormReady();
      expect(screen.queryByLabelText(coreStrings.passwordLabel$())).not.toBeInTheDocument();
    });
  });

  describe('user type selection', () => {
    it('shows the password input and hides picture-password info when Coach is selected', async () => {
      setup({ pictureLogin: true });
      await waitForFormReady();
      await selectKind(coreStrings.coachLabel$());

      await waitFor(() => {
        expect(screen.getByLabelText(coreStrings.passwordLabel$())).toHaveValue('');
      });
      expect(screen.queryByTestId('picture-password-info')).not.toBeInTheDocument();
      expect(screen.getByLabelText(coreStrings.classCoachLabel$(), { exact: false })).toBeChecked();
    });

    it('shows the password input when Admin is selected with picture login enabled', async () => {
      setup({ pictureLogin: true });
      await waitForFormReady();
      await selectKind(coreStrings.adminLabel$());

      await waitFor(() => {
        expect(screen.getByLabelText(coreStrings.passwordLabel$())).toHaveValue('');
      });
      expect(screen.queryByTestId('picture-password-info')).not.toBeInTheDocument();
      expect(screen.queryByTestId('coach-type-selector')).not.toBeInTheDocument();
    });
  });

  describe('learner limit reached', () => {
    it('shows the warning and disables the submit buttons when picture passwords are exhausted', async () => {
      setup({ pictureLogin: true, exhausted: true });
      await waitForFormReady();
      expect(screen.getByText(picturePasswordStrings.learnerCreationDisabled$())).toBeVisible();
      expect(saveAndCloseButton()).toBeDisabled();
      expect(saveAndAddAnotherButton()).toBeDisabled();
    });

    it('hides the warning and enables the submit buttons when the user switches to Coach', async () => {
      setup({ pictureLogin: true, exhausted: true });
      await waitForFormReady();
      await selectKind(coreStrings.coachLabel$());

      await waitFor(() => {
        expect(screen.queryByTestId('learn-more-button')).not.toBeInTheDocument();
      });
      expect(saveAndCloseButton()).toBeEnabled();
      expect(saveAndAddAnotherButton()).toBeEnabled();
    });

    it('opens the learner limit modal when the "Learn more" button is clicked', async () => {
      setup({ pictureLogin: true, exhausted: true });
      await waitForFormReady();
      await fireEvent.click(screen.getByTestId('learn-more-button'));

      await waitFor(() => {
        expect(
          screen.getByRole('heading', {
            name: picturePasswordStrings.learnerLimitReachedHeading$(),
          }),
        ).toBeVisible();
      });
    });
  });

  describe('form submission', () => {
    it.each([
      {
        name: 'a learner with a password',
        setupOpts: {},
        kindLabel: null,
        facilityCoach: false,
        password: 'secret123',
        expectedRole: null,
      },
      {
        name: 'a learner with no password',
        setupOpts: { learnerCanLoginWithNoPassword: true },
        kindLabel: null,
        facilityCoach: false,
        password: NOT_SPECIFIED,
        expectedRole: null,
      },
      {
        name: 'a learner with picture login',
        setupOpts: { pictureLogin: true },
        kindLabel: null,
        facilityCoach: false,
        password: NOT_SPECIFIED,
        expectedRole: null,
      },
      {
        name: 'a class coach',
        setupOpts: {},
        kindLabel: 'coachLabel',
        facilityCoach: false,
        password: 'secret123',
        expectedRole: UserKinds.ASSIGNABLE_COACH,
      },
      {
        name: 'a facility coach',
        setupOpts: {},
        kindLabel: 'coachLabel',
        facilityCoach: true,
        password: 'secret123',
        expectedRole: UserKinds.COACH,
      },
      {
        name: 'an admin',
        setupOpts: {},
        kindLabel: 'adminLabel',
        facilityCoach: false,
        password: 'secret123',
        expectedRole: UserKinds.ADMIN,
      },
    ])(
      'creates $name with the correct role and password',
      async ({ setupOpts, kindLabel, facilityCoach, password, expectedRole }) => {
        FacilityUserResource.saveModel.mockResolvedValue({
          id: 'new-user-id',
          facility: 'fac-1',
        });
        RoleResource.saveModel.mockResolvedValue({});
        setup(setupOpts);
        await waitForFormReady();
        if (kindLabel) {
          await selectKind(coreStrings[`${kindLabel}$`]());
        }
        if (facilityCoach) {
          await fireEvent.click(
            screen.getByLabelText(coreStrings.facilityCoachLabel$(), { exact: false }),
          );
        }
        await fillRequired();
        if (password !== NOT_SPECIFIED) {
          await setPassword(password);
        }
        await fireEvent.click(saveAndCloseButton());

        await waitFor(() => {
          expect(FacilityUserResource.saveModel).toHaveBeenCalledTimes(1);
        });
        expect(FacilityUserResource.saveModel).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              username: 'testuser',
              full_name: 'Test User',
              password,
            }),
          }),
        );
        if (expectedRole === null) {
          expect(RoleResource.saveModel).not.toHaveBeenCalled();
        } else {
          await waitFor(() => {
            expect(RoleResource.saveModel).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({ kind: expectedRole }),
              }),
            );
          });
        }
      },
    );

    it('does not call FacilityUserResource when the form is submitted with empty fields', async () => {
      setup();
      await waitForFormReady();
      await fireEvent.click(saveAndCloseButton());
      expect(FacilityUserResource.saveModel).not.toHaveBeenCalled();
    });

    it('does not call FacilityUserResource when picture passwords are exhausted', async () => {
      setup({ pictureLogin: true, exhausted: true });
      await waitForFormReady();
      await fillRequired();
      await fireEvent.click(saveAndCloseButton());
      expect(FacilityUserResource.saveModel).not.toHaveBeenCalled();
    });
  });

  describe('when the picture login feature is disabled (non-English locale)', () => {
    it('hides the picture password info block even when the facility has picture passwords configured', async () => {
      setup({ pictureLogin: true, pictureLoginFeatureEnabled: false });
      await waitForFormReady();
      expect(screen.queryByTestId('picture-password-info')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: picturePasswordStrings.signingInHeading$() }),
      ).not.toBeInTheDocument();
    });

    it('shows the password input for learners even when the facility has picture passwords configured', async () => {
      setup({ pictureLogin: true, pictureLoginFeatureEnabled: false });
      await waitForFormReady();
      expect(screen.getByLabelText(coreStrings.passwordLabel$())).toHaveValue('');
    });

    it('hides the learner-limit-exhausted warning and keeps the submit buttons enabled', async () => {
      setup({ pictureLogin: true, exhausted: true, pictureLoginFeatureEnabled: false });
      await waitForFormReady();
      expect(
        screen.queryByText(picturePasswordStrings.learnerCreationDisabled$()),
      ).not.toBeInTheDocument();
      expect(saveAndCloseButton()).toBeEnabled();
      expect(saveAndAddAnotherButton()).toBeEnabled();
    });

    it('submits the form with the user-supplied password when the facility has picture passwords configured', async () => {
      FacilityUserResource.saveModel.mockResolvedValue({ id: 'new-user-id', facility: 'fac-1' });
      setup({ pictureLogin: true, pictureLoginFeatureEnabled: false });
      await waitForFormReady();
      await fillRequired();
      await setPassword('secret123');
      await fireEvent.click(saveAndCloseButton());

      await waitFor(() => {
        expect(FacilityUserResource.saveModel).toHaveBeenCalledTimes(1);
      });
      expect(FacilityUserResource.saveModel).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'secret123' }),
        }),
      );
    });
  });
});
