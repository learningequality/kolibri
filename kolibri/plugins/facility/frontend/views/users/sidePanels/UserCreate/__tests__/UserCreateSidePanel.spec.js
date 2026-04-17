import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import useFacility from 'kolibri-common/composables/useFacility';
import { useFacilityMock } from 'kolibri-common/composables/__mocks__/useFacility';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
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

  return render(UserCreateSidePanel, {
    props: {
      classes: [],
      onChange: jest.fn(),
    },
    stubs: {
      SidePanelModal: {
        name: 'SidePanelModal',
        template: `<div>
          <slot name="header" />
          <slot name="default" />
          <slot name="bottomNavigation" />
        </div>`,
      },
      // KButton stub renders as a <button> so tests can query by role and fire click events
      // without coupling to design-system internals. appearance="basic-link" renders <a>
      // without href in the real component, giving it no ARIA role, so we stub here instead.
      // aria-label is intentionally not declared as a prop: Vue's inheritAttrs passes it
      // through to the root <button> element automatically, so the accessible name from
      // the component's :aria-label binding is verifiable in tests.
      // KButton stub passes $attrs through so data-testid bindings from the component
      // are forwarded to the root <button> element and queryable in tests.
      KButton: {
        name: 'KButton',
        props: ['text', 'appearance', 'primary', 'form', 'disabled'],
        inheritAttrs: false,
        template:
          '<button type="button" v-bind="$attrs" @click="$emit(\'click\', $event)">{{ text }}</button>',
      },
      // KSelect stub renders a native <select> so that option.disabled is reflected through
      // the HTML disabled attribute. Tests can assert toBeDisabled() on the <option> element
      // directly — testing what the component passes as props, not stub-implemented logic.
      KSelect: {
        name: 'KSelect',
        props: ['options', 'value', 'disabled', 'label'],
        template: `<select
          :aria-label="label"
          :disabled="disabled"
          @change="$emit('input', options.find(o => o.value === $event.target.value))"
        >
          <option
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            :disabled="opt.disabled"
            :data-testid="'user-type-' + opt.value"
          >{{ opt.label }}</option>
        </select>`,
      },
      FullNameTextbox: {
        name: 'FullNameTextbox',
        template: '<div />',
        methods: { reset: jest.fn(), focus: jest.fn() },
      },
      UsernameTextbox: {
        name: 'UsernameTextbox',
        template: '<div />',
        methods: { reset: jest.fn(), focus: jest.fn() },
      },
      PasswordTextbox: {
        name: 'PasswordTextbox',
        template: '<div data-testid="password-textbox" />',
        methods: { reset: jest.fn(), focus: jest.fn() },
      },
      LearnerLimitReachedModal: {
        name: 'LearnerLimitReachedModal',
        template: '<div data-testid="learner-limit-modal" />',
      },
      IdentifierTextbox: true,
      BirthYearSelect: true,
      GenderSelect: true,
      ClassesSelect: true,
      ExtraDemographics: true,
      CloseConfirmationGuard: true,
    },
  });
}

describe('UserCreateSidePanel — picture password behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
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

      await fireEvent.update(screen.getByRole('combobox'), 'coach');

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

      // Wait for loading to finish, then confirm the limit link is absent
      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('learn-more-button')).not.toBeInTheDocument();
    });

    it('leaves the user type dropdown empty when learner limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });
      // No type pre-selected, so the coach radio group should not be visible
      expect(screen.queryByTestId('coach-type-selector')).not.toBeInTheDocument();
    });

    it('Learner option is disabled and Coach/Admin are not when limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-type-learner')).toBeDisabled();
      expect(screen.getByTestId('user-type-coach')).toBeEnabled();
      expect(screen.getByTestId('user-type-admin')).toBeEnabled();
    });

    it('opens the learner limit modal when the "Learn more" button is clicked', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        picturePasswordsExhausted: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId('learn-more-button')).toBeInTheDocument();
      });
      await fireEvent.click(screen.getByTestId('learn-more-button'));

      await waitFor(() => {
        expect(screen.getByTestId('learner-limit-modal')).toBeInTheDocument();
      });
    });
  });
});

describe('UserCreateSidePanel — user creation form behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('password field visibility', () => {
    it('is shown when the facility requires a password', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('password-textbox')).toBeInTheDocument();
      });
    });

    it('is hidden for learners when the facility allows no-password login', async () => {
      renderComponent({ learnerCanLoginWithNoPassword: true });

      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });
      await fireEvent.update(screen.getByRole('combobox'), 'learner');

      await waitFor(() => {
        expect(screen.queryByTestId('password-textbox')).not.toBeInTheDocument();
      });
    });

    it('is shown for coaches even when the facility allows no-password login', async () => {
      renderComponent({ learnerCanLoginWithNoPassword: true });

      await waitFor(() => {
        expect(screen.getByTestId('user-type-coach')).toBeInTheDocument();
      });
      await fireEvent.update(screen.getByRole('combobox'), 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('password-textbox')).toBeInTheDocument();
      });
    });
  });

  describe('coach type selection', () => {
    it('shows the class/facility coach radio group when Coach is selected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('user-type-coach')).toBeInTheDocument();
      });
      await fireEvent.update(screen.getByRole('combobox'), 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('coach-type-selector')).toBeInTheDocument();
      });
    });

    it('does not show the coach radio group when Learner is selected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });
      await fireEvent.update(screen.getByRole('combobox'), 'learner');

      await waitFor(() => {
        expect(screen.queryByTestId('coach-type-selector')).not.toBeInTheDocument();
      });
    });

    it('does not show the coach radio group when Admin is selected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('user-type-admin')).toBeInTheDocument();
      });
      await fireEvent.update(screen.getByRole('combobox'), 'admin');

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
        expect(screen.getByRole('button', { name: /save and close/i })).toBeInTheDocument();
      });
      await fireEvent.click(screen.getByRole('button', { name: /save and close/i }));

      expect(FacilityUserResource.saveModel).not.toHaveBeenCalled();
    });

    it('does not call FacilityUserResource when "Save and add another" is clicked with empty fields', async () => {
      FacilityUserResource.saveModel.mockResolvedValue({ id: 'new-user-id', facility: 'fac-1' });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save and add another/i })).toBeInTheDocument();
      });
      await fireEvent.click(screen.getByRole('button', { name: /save and add another/i }));

      expect(FacilityUserResource.saveModel).not.toHaveBeenCalled();
    });
  });
});
