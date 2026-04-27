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
const checkbox = name => screen.getByRole('checkbox', { name });

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

  it('submitting a sequence calls createSession with picture_password payload', async () => {
    renderComponent();
    await userEvent.click(checkbox(bee()));
    await userEvent.click(checkbox(star()));
    await userEvent.click(checkbox(moon()));
    await userEvent.click(screen.getByTestId('submit-button'));

    expect(mockLogin).toHaveBeenCalledWith({
      facility: 'facility_1',
      picture_password: '1.2.3',
    });
  });

  it('a failed sequence response clears the grid selection', async () => {
    mockLogin.mockResolvedValue(LoginErrors.INVALID_CREDENTIALS);
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
});
