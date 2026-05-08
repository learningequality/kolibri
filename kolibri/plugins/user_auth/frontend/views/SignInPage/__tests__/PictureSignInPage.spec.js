import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import useUser from 'kolibri/composables/useUser';
import { LoginErrors } from 'kolibri/constants';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import { useRoute, useRouter } from 'vue-router/composables';
import useAuthFlow from '../../../composables/useAuthFlow';
import useAuthWatcher from '../../../composables/useAuthWatcher';
import PictureSignInPage from '../PictureSignInPage.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: {
    allowRemoteAccess: true,
    oidcProviderEnabled: false,
    allowGuestAccess: false,
    deviceUnusableReason: null,
  },
}));
jest.mock('../../../composables/useAuthFlow');
jest.mock('../../../composables/useAuthRouter');
jest.mock('../../../composables/useAuthWatcher');
jest.mock('vue-router/composables');

const mockLogin = jest.fn();
const mockRouterPush = jest.fn();
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
  useUser.mockReturnValue({
    login: mockLogin,
    isAppContext: ref(true),
  });
  useAuthFlow.mockReturnValue({
    hasMultipleFacilities: ref(false),
    facilityId: ref('facility_1'),
    selectedFacility: ref({ id: 'facility_1', name: 'Facility 1' }),
    signInOptions: ref([OptionsForSignIn.PICTURE_PASSWORD]),
    signInMethod: ref(OptionsForSignIn.PICTURE_PASSWORD),
    canSignUp: ref(false),
  });
  useAuthWatcher.mockReturnValue({
    watchForFacilityChange: jest.fn(),
    watchForFacilityConfigChange: jest.fn(),
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

  it('a failed prevalidation clears the grid selection', async () => {
    mockLogin.mockResolvedValue({ data: null, error: LoginErrors.INVALID_CREDENTIALS });
    renderComponent();
    await userEvent.click(checkbox(bee()));
    await userEvent.click(checkbox(star()));
    await userEvent.click(checkbox(moon()));
    await userEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(checkbox(bee())).not.toBeChecked();
      expect(checkbox(star())).not.toBeChecked();
      expect(checkbox(moon())).not.toBeChecked();
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
      const redirectBrowser = require('kolibri/utils/redirectBrowser').default;
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
        );
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
      const client = require('kolibri/client').default;
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
      expect(client).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'delete' }));
    });
  });
});
