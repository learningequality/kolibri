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
const mockSendPoliteMessage = jest.fn();
const mockSendAssertiveMessage = jest.fn();

jest.mock('../../../composables/useAuthFlow');
jest.mock('../../../composables/useAuthRouter');
jest.mock('../../../composables/useAuthWatcher');
jest.mock('vue-router/composables');
jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    sendPoliteMessage: mockSendPoliteMessage,
    sendAssertiveMessage: mockSendAssertiveMessage,
  })),
}));
const bee = () => picturePasswordStrings.bee$();
const star = () => picturePasswordStrings.star$();
const moon = () => picturePasswordStrings.moon$();
const isThisYou = () => picturePasswordStrings.isThisYou$();
const cancelLabel = () => picturePasswordStrings.noGoBackAction$();
const confirmLabel = () => picturePasswordStrings.yesConfirmAction$();
const checkbox = name => screen.getByRole('checkbox', { name });

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
  beforeEach(() => {
    mockLogin.mockReset();
    mockRouterPush.mockReset();
    mockSendPoliteMessage.mockReset();
    mockSendAssertiveMessage.mockReset();
    redirectBrowser.mockReset();
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('submitting a sequence calls login with prevalidate=true, not a real login', async () => {
    mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
    renderComponent();
    await userEvent.click(checkbox(bee()));
    await userEvent.click(checkbox(star()));
    await userEvent.click(checkbox(moon()));
    await userEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ picture_password: '1.2.3', facility: 'facility_1' }),
        true,
        false,
      );
    });
  });

  it('a failed response clears the grid selection after shake ends', async () => {
    mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
    renderComponent();
    await userEvent.click(checkbox(bee()));
    await userEvent.click(checkbox(star()));
    await userEvent.click(checkbox(moon()));
    await userEvent.click(screen.getByTestId('submit-button'));

    // Grid is still filled while the shake is active
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
    mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
    const { container } = renderComponent();
    await userEvent.click(checkbox(bee()));
    await userEvent.click(checkbox(star()));
    await userEvent.click(checkbox(moon()));
    await userEvent.click(screen.getByTestId('submit-button'));

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

    async function submitSequence() {
      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(screen.getByTestId('submit-button'));
    }

    it('shows the confirmation modal with learner name after successful prevalidation', async () => {
      renderComponent();
      await submitSequence();

      await waitFor(() => {
        expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument();
        expect(screen.getByText(isThisYou())).toBeInTheDocument();
      });
    });

    it('does not redirect immediately after a successful prevalidation', async () => {
      renderComponent();
      await submitSequence();

      await waitFor(() => {
        expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument();
      });

      expect(redirectBrowser).not.toHaveBeenCalled();
    });

    it('calls login when confirm is clicked', async () => {
      renderComponent();
      await submitSequence();

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const confirmButton = screen.getByRole('button', { name: confirmLabel() });
      await userEvent.click(confirmButton);

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

      renderComponent();
      await submitSequence();

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const confirmButton = screen.getByRole('button', { name: confirmLabel() });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(redirectBrowser).toHaveBeenCalledTimes(1);
      });
    });

    it('dismisses the modal and triggers wrong sequence when confirm login fails', async () => {
      mockLogin
        .mockResolvedValueOnce({ data: { full_name: MOCK_LEARNER_NAME }, error: null })
        .mockResolvedValueOnce({ data: null, error: LoginErrors.INVALID_CREDENTIALS });

      renderComponent();
      await submitSequence();

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const confirmButton = screen.getByRole('button', { name: confirmLabel() });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText(MOCK_LEARNER_NAME)).not.toBeInTheDocument();
        expect(checkbox(bee())).not.toBeChecked();
        expect(checkbox(star())).not.toBeChecked();
        expect(checkbox(moon())).not.toBeChecked();
      });
    });

    it('hides the modal and clears grid when cancel is clicked, without making a delete request', async () => {
      renderComponent();
      await submitSequence();

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      const cancelButton = screen.getByRole('button', { name: cancelLabel() });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(MOCK_LEARNER_NAME)).not.toBeInTheDocument();
        expect(checkbox(bee())).not.toBeChecked();
        expect(checkbox(star())).not.toBeChecked();
        expect(checkbox(moon())).not.toBeChecked();
      });
    });
  });

  describe('error handling and accessibility', () => {
    it('sends an assertive message and returns focus to the form after a failed prevalidate', async () => {
      mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
      const { container } = renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(screen.getByTestId('submit-button'));

      // Wait for the sequence to clear after shake resolves
      await waitFor(() => {
        expect(checkbox(bee())).not.toBeChecked();
      });

      // Assertive message should have been sent with the error string
      expect(mockSendAssertiveMessage).toHaveBeenCalledWith(
        picturePasswordStrings.wrongPicturesTryAgain$(),
      );

      // Focus should be on the form
      const form = container.querySelector('form');
      expect(form).toHaveFocus();
    });

    it('sends an assertive message and returns focus to the form after confirm login fails', async () => {
      mockLogin
        .mockResolvedValueOnce({ data: { full_name: MOCK_LEARNER_NAME }, error: null })
        .mockResolvedValueOnce({ data: null, error: LoginErrors.INVALID_CREDENTIALS });

      renderComponent();
      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: confirmLabel() }));

      // Wait for the sequence to clear after shake resolves
      await waitFor(() => {
        expect(checkbox(bee())).not.toBeChecked();
      });

      expect(mockSendAssertiveMessage).toHaveBeenCalledWith(
        picturePasswordStrings.wrongPicturesTryAgain$(),
      );
    });

    it('shows a visible error notification after a failed prevalidate', async () => {
      mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
      renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(screen.getByTestId('submit-button'));

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

      renderComponent();
      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => expect(screen.getByText(MOCK_LEARNER_NAME)).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: confirmLabel() }));

      await waitFor(() => {
        expect(
          screen.getByText(picturePasswordStrings.wrongPicturesTryAgain$()),
        ).toBeInTheDocument();
      });
    });

    it('clears the visible error notification on the next submission attempt', async () => {
      mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
      renderComponent();

      // First failed attempt
      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(
          screen.getByText(picturePasswordStrings.wrongPicturesTryAgain$()),
        ).toBeInTheDocument();
      });

      // Second attempt — error should clear immediately on submit
      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(
          screen.queryByText(picturePasswordStrings.wrongPicturesTryAgain$()),
        ).not.toBeInTheDocument();
      });
    });
  });
});
