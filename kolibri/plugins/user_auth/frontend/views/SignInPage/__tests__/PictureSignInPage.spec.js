import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import { LoginErrors } from 'kolibri/constants';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import { useRoute, useRouter } from 'vue-router/composables';
import useAuthFlow from '../../../composables/useAuthFlow';
import useAuthWatcher from '../../../composables/useAuthWatcher';
import useAuthRouter from '../../../composables/useAuthRouter';
import PictureSignInPage from '../PictureSignInPage.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: {
    allowRemoteAccess: true,
    oidcProviderEnabled: false,
    allowGuestAccess: false,
    deviceUnusableReason: null,
  },
}));
const mockLogin = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('../../../composables/useAuthFlow');
jest.mock('../../../composables/useAuthRouter');
jest.mock('../../../composables/useAuthWatcher');
jest.mock('vue-router/composables');
const bee = () => picturePasswordStrings.bee$();
const star = () => picturePasswordStrings.star$();
const moon = () => picturePasswordStrings.moon$();
const isThisYou = () => picturePasswordStrings.isThisYou$();
const cancelLabel = () => picturePasswordStrings.noGoBackAction$();
const confirmLabel = () => picturePasswordStrings.yesConfirmAction$();
const checkbox = name => screen.getByRole('checkbox', { name });

function createUser() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

const MOCK_LEARNER_NAME = 'Alice Example';

function renderComponent() {
  useRoute.mockReturnValue({ query: {} });
  useRouter.mockReturnValue({
    push: mockRouterPush,
  });
  useUser.mockReturnValue(
    useUserMock({
      login: mockLogin,
      isAppContext: true,
      isUserLoggedIn: false,
      userFacilityId: null,
      isSuperuser: false,
    }),
  );
  useAuthFlow.mockReturnValue({
    hasMultipleFacilities: ref(false),
    facilityId: ref('facility_1'),
    selectedFacility: ref({ id: 'facility_1', name: 'Facility 1' }),
    signInOptions: ref([OptionsForSignIn.PICTURE_PASSWORD]),
    signInMethod: ref(OptionsForSignIn.PICTURE_PASSWORD),
    picturePasswordStyle: ref('colorful'),
    picturePasswordShowIconText: ref(true),
    canSignUp: ref(false),
  });
  useAuthWatcher.mockReturnValue({
    watchForFacilityChange: jest.fn(),
    watchForFacilityConfigChange: jest.fn(),
  });
  useAuthRouter.mockReturnValue({
    nextParam: ref('/next'),
    defaultRoute: ref({ name: 'SignInPage' }),
    pictureSignInRoute: ref({ name: 'PictureSignInPage' }),
    usernameSignInRoute: ref({ name: 'SignInPage' }),
    signUpRoute: ref({ name: 'SignUpPage' }),
    getFacilitySelectionRoute: jest.fn(),
  });

  return render(PictureSignInPage, {
    routes: [
      { name: 'PictureSignInPage', path: '/picture' },
      { name: 'SignInPage', path: '/signin' },
      { name: 'SignUpPage', path: '/signup' },
      { name: 'FacilitySelect', path: '/facilities' },
    ],
  });
}

describe('PictureSignInPage', () => {
  // Suppress all animation timers so event handlers and state transitions resolve
  // in fake time. Animation timing is tested in PicturePasswordConfirmModal.spec.js.
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    window.matchMedia = jest.fn(q => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    mockLogin.mockReset();
    mockRouterPush.mockReset();
    redirectBrowser.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    window.matchMedia = undefined;
  });

  it('submitting a sequence calls login with prevalidate=true, not a real login', async () => {
    const user = createUser();
    mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
    renderComponent();
    await user.click(checkbox(bee()));
    await user.click(checkbox(star()));
    await user.click(checkbox(moon()));
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ picture_password: '1.2.3', facility: 'facility_1' }),
        true,
        false,
      );
    });
  });

  it('a failed response clears the grid selection after shake ends', async () => {
    const user = createUser();
    mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
    renderComponent();
    await user.click(checkbox(bee()));
    await user.click(checkbox(star()));
    await user.click(checkbox(moon()));
    await user.click(screen.getByTestId('submit-button'));

    // Grid is still filled while the shake timer is pending
    expect(checkbox(bee())).toBeChecked();
    expect(checkbox(star())).toBeChecked();
    expect(checkbox(moon())).toBeChecked();

    await waitFor(() => {
      expect(checkbox(bee())).not.toBeChecked();
      expect(checkbox(star())).not.toBeChecked();
      expect(checkbox(moon())).not.toBeChecked();
    });
  });

  it('applies shaking class on a failed sequence and removes it after shake() resolves', async () => {
    const user = createUser();
    mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
    const { container } = renderComponent();
    await user.click(checkbox(bee()));
    await user.click(checkbox(star()));
    await user.click(checkbox(moon()));
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(container.querySelector('.shaking')).toBeTruthy();
    });

    await waitFor(() => {
      expect(container.querySelector('.shaking')).toBeFalsy();
    });
  });

  describe('confirmation modal', () => {
    beforeEach(() => {
      mockLogin.mockResolvedValue({ data: { full_name: MOCK_LEARNER_NAME }, error: null });
    });

    async function submitSequence(user) {
      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));
    }

    it('shows the confirmation modal with learner name after successful prevalidation', async () => {
      const user = createUser();
      renderComponent();
      await submitSequence(user);

      await waitFor(() => {
        expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument();
        expect(screen.getByText(isThisYou())).toBeInTheDocument();
      });
    });

    it('does not redirect immediately after a successful prevalidation', async () => {
      const user = createUser();
      renderComponent();
      await submitSequence(user);

      await waitFor(() => {
        expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument();
      });

      expect(redirectBrowser).not.toHaveBeenCalled();
    });

    it('calls login when confirm is clicked', async () => {
      const user = createUser();
      renderComponent();
      await submitSequence(user);

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const confirmButton = screen.getByRole('button', { name: confirmLabel() });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          expect.objectContaining({ facility: 'facility_1', picture_password: '1.2.3' }),
          false,
          false,
        );
      });
    });

    it('redirects when confirm is clicked and login succeeds', async () => {
      mockLogin
        .mockResolvedValueOnce({ data: { full_name: MOCK_LEARNER_NAME }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const user = createUser();
      renderComponent();
      await submitSequence(user);

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const confirmButton = screen.getByRole('button', { name: confirmLabel() });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(redirectBrowser).toHaveBeenCalledTimes(1);
      });
    });

    it('dismisses the modal and triggers wrong sequence when confirm login fails', async () => {
      mockLogin
        .mockResolvedValueOnce({ data: { full_name: MOCK_LEARNER_NAME }, error: null })
        .mockResolvedValueOnce({ data: null, error: LoginErrors.INVALID_CREDENTIALS });

      const user = createUser();
      renderComponent();
      await submitSequence(user);

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const confirmButton = screen.getByRole('button', { name: confirmLabel() });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText(MOCK_LEARNER_NAME)).not.toBeInTheDocument();
        expect(checkbox(bee())).not.toBeChecked();
        expect(checkbox(star())).not.toBeChecked();
        expect(checkbox(moon())).not.toBeChecked();
      });
    });

    it('hides the modal and clears grid when cancel is clicked, without making a delete request', async () => {
      const user = createUser();
      renderComponent();
      await submitSequence(user);

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const cancelButton = screen.getByRole('button', { name: cancelLabel() });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(MOCK_LEARNER_NAME)).not.toBeInTheDocument();
        expect(checkbox(bee())).not.toBeChecked();
        expect(checkbox(star())).not.toBeChecked();
        expect(checkbox(moon())).not.toBeChecked();
      });
    });
  });

  describe('error handling and accessibility', () => {
    it('focuses the sentinel inside the grid on mount so screen readers do not announce all icons', async () => {
      const { container } = renderComponent();
      await waitFor(() => {
        const sentinel = container.querySelector('form [aria-hidden="true"]');
        expect(sentinel).toHaveFocus();
      });
    });

    it('returns focus to the error sentinel inside the grid after a failed prevalidate', async () => {
      const user = createUser();
      mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
      const { container } = renderComponent();

      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        const sentinel = container.querySelector('form [aria-hidden="true"]');
        expect(sentinel).toHaveFocus();
      });
    });

    it('returns focus to the error sentinel inside the grid after confirm login fails', async () => {
      mockLogin
        .mockResolvedValueOnce({ data: { full_name: MOCK_LEARNER_NAME }, error: null })
        .mockResolvedValueOnce({ data: null, error: LoginErrors.INVALID_CREDENTIALS });

      const user = createUser();
      const { container } = renderComponent();
      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: confirmLabel() }));

      await waitFor(() => {
        const sentinel = container.querySelector('form [aria-hidden="true"]');
        expect(sentinel).toHaveFocus();
      });
    });

    it('shows a visible error notification after a failed prevalidate', async () => {
      const user = createUser();
      mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
      renderComponent();

      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(
          screen.getByText(picturePasswordStrings.wrongPicturesTryAgain$()),
        ).toBeInTheDocument();
      });
    });

    it('shows a visible error notification after confirm login fails', async () => {
      mockLogin
        .mockResolvedValueOnce({ data: { full_name: MOCK_LEARNER_NAME }, error: null })
        .mockResolvedValueOnce({ data: null, error: LoginErrors.INVALID_CREDENTIALS });

      const user = createUser();
      renderComponent();
      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: confirmLabel() }));

      await waitFor(() => {
        expect(
          screen.getByText(picturePasswordStrings.wrongPicturesTryAgain$()),
        ).toBeInTheDocument();
      });
    });

    it('clears the error notification when the first icon of a new sequence is selected', async () => {
      const user = createUser();
      mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
      renderComponent();

      // First failed attempt — error notification appears
      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(
          screen.getByText(picturePasswordStrings.wrongPicturesTryAgain$()),
        ).toBeInTheDocument();
      });

      // Selecting the first icon of the next sequence clears the error immediately
      await user.click(checkbox(bee()));
      expect(
        screen.queryByText(picturePasswordStrings.wrongPicturesTryAgain$()),
      ).not.toBeInTheDocument();
    });

    it('clears the visible error notification on the next submission attempt', async () => {
      const user = createUser();
      mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
      renderComponent();

      // First failed attempt
      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(
          screen.getByText(picturePasswordStrings.wrongPicturesTryAgain$()),
        ).toBeInTheDocument();
      });

      // Second attempt — prevalidate clears wrongPictures before the shake timer fires
      await user.click(checkbox(bee()));
      await user.click(checkbox(star()));
      await user.click(checkbox(moon()));
      await user.click(screen.getByTestId('submit-button'));

      expect(
        screen.queryByText(picturePasswordStrings.wrongPicturesTryAgain$()),
      ).not.toBeInTheDocument();
    });
  });
});
