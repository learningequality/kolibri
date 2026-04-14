import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref, computed } from 'vue';
import useFacility, {
  useFacilityConfig,
  useFacilityMock,
  useFacilityConfigMock,
} from 'kolibri-common/composables/useFacility';
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
  picturePasswordsExhausted = false,
} = {}) {
  return ref({
    picture_password_settings: picturePasswordSettings,
    picture_passwords_exhausted: picturePasswordsExhausted,
    learner_can_login_with_no_password: false,
    extra_fields: null,
  });
}

function renderComponent({
  picturePasswordSettings = null,
  isPictureLoginFeatureEnabled = true,
  picturePasswordsExhausted = false,
} = {}) {
  useFacility.mockImplementation(() =>
    useFacilityMock({
      facilityConfig: makeFacilityConfig({ picturePasswordSettings, picturePasswordsExhausted }),
      setFacilityId: jest.fn().mockResolvedValue(undefined),
    }),
  );
  // picturePasswordSettings is read from facilityConfig (useFacility), not useFacilityConfig,
  // so only isPictureLoginFeatureEnabled needs to be mocked here.
  useFacilityConfig.mockImplementation(() =>
    useFacilityConfigMock({
      isPictureLoginFeatureEnabled: computed(() => isPictureLoginFeatureEnabled),
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
      KButton: {
        name: 'KButton',
        props: ['text', 'appearance', 'primary', 'form', 'disabled'],
        template: '<button type="button" @click="$emit(\'click\', $event)">{{ text }}</button>',
      },
      // KSelect stub renders each option as a button with a data-testid and aria-disabled so
      // tests can assert on the component's userTypeOptions data without coupling to Keen-UI
      // internal class names (.ui-select-label, .ui-select-option, .is-disabled).
      KSelect: {
        name: 'KSelect',
        props: ['options', 'value', 'disabled', 'label'],
        template: `<div>
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            :data-testid="'user-type-' + opt.value"
            :aria-disabled="String(Boolean(opt.disabled))"
            @click="!opt.disabled && $emit('input', opt)"
          >{{ opt.label }}</button>
        </div>`,
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
        template: '<div />',
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
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('is not shown when picture password feature flag is off', () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: false,
        picturePasswordsExhausted: false,
      });
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('is shown when picture login is enabled and limit is not reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: false,
      });

      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });
    });

    it('is not shown when learner limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: true,
      });

      // Wait for loading to finish — the "Learn more" button confirms the limit state is rendered
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
      });
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('is not shown when a non-Learner role is selected', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: false,
      });

      // Starts with Learner selected — info is visible
      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });

      // Select Coach via the KSelect stub's button
      await fireEvent.click(screen.getByTestId('user-type-coach'));

      await waitFor(() => {
        expect(screen.queryByRole('region')).not.toBeInTheDocument();
      });
    });
  });

  describe('learner limit reached state', () => {
    it('shows the learner limit message with a "Learn more" button when limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: true,
      });

      await waitFor(() => {
        // Verify the button is present and carries the full accessible label (aria-label),
        // not just the visible text, so screen reader users get context.
        expect(
          screen.getByRole('button', { name: 'Learn more about the learner creation limit' }),
        ).toBeInTheDocument();
      });
    });

    it('does not show the learner limit message when under the limit', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: false,
      });

      // Wait for loading to finish, then confirm the limit link is absent
      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /learn more/i })).not.toBeInTheDocument();
    });

    it('defaults kind to Coach when learner limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: true,
      });

      // The coach radio group fieldset renders only when coachIsSelected is true
      await waitFor(() => {
        expect(screen.getByRole('group')).toBeInTheDocument();
      });
    });

    it('Learner option is disabled and Coach/Admin are not when limit is reached', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: true,
      });

      // Wait for the KSelect stub's buttons to appear (loading done)
      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-type-learner')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByTestId('user-type-coach')).toHaveAttribute('aria-disabled', 'false');
      expect(screen.getByTestId('user-type-admin')).toHaveAttribute('aria-disabled', 'false');
    });

    it('disables Learner even when the locale feature flag is off (non-English admins cannot bypass the cap)', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: false,
        picturePasswordsExhausted: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-type-learner')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-type-learner')).toHaveAttribute('aria-disabled', 'true');
    });

    it('opens the learner limit modal when the "Learn more" button is clicked', async () => {
      renderComponent({
        picturePasswordSettings: PICTURE_PASSWORD_SETTINGS,
        isPictureLoginFeatureEnabled: true,
        picturePasswordsExhausted: true,
      });

      const learnMoreButton = await screen.findByRole('button', { name: /learn more/i });
      await fireEvent.click(learnMoreButton);

      await waitFor(() => {
        expect(screen.getByTestId('learner-limit-modal')).toBeInTheDocument();
      });
    });
  });
});
