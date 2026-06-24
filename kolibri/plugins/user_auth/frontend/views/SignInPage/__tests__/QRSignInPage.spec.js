import { render, screen } from '@testing-library/vue';
import { ref } from 'vue';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';
import { useRoute, useRouter } from 'vue-router/composables';
import useAuthFlow from '../../../composables/useAuthFlow';
import useAuthWatcher from '../../../composables/useAuthWatcher';
import useAuthRouter from '../../../composables/useAuthRouter';
import QRSignInPage from '../QRSignInPage.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: jest.fn().mockResolvedValue({ stop: jest.fn() }),
    decodeFromImageElement: jest.fn().mockResolvedValue(null),
  })),
}));
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

function renderComponent() {
  useRoute.mockReturnValue({ query: {} });
  useRouter.mockReturnValue({ push: jest.fn() });
  useUser.mockReturnValue(
    useUserMock({
      login: jest.fn(),
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
    signInOptions: ref([OptionsForSignIn.QR_LOGIN]),
    signInMethod: ref(OptionsForSignIn.QR_LOGIN),
    canSignUp: ref(false),
  });
  useAuthWatcher.mockReturnValue({
    watchForFacilityChange: jest.fn(),
    watchForFacilityConfigChange: jest.fn(),
  });
  useAuthRouter.mockReturnValue({
    nextParam: ref(null),
    defaultRoute: ref({ name: 'SignInPage' }),
    qrSignInRoute: ref({ name: 'QRSignInPage' }),
    usernameSignInRoute: ref({ name: 'SignInPage' }),
    signUpRoute: ref({ name: 'SignUpPage' }),
    getFacilitySelectionRoute: jest.fn(),
  });

  return render(QRSignInPage, {
    routes: [
      { name: 'QRSignInPage', path: '/qr-signin' },
      { name: 'SignInPage', path: '/signin' },
    ],
  });
}

describe('QRSignInPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });
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

  it('renders the page heading and description', () => {
    renderComponent();
    expect(screen.getByText(qrLoginStrings.scanQRCodeTitle$())).toBeInTheDocument();
    expect(screen.getByText(qrLoginStrings.scanQRCodeDescription$())).toBeInTheDocument();
  });

  it('renders the secure-context message when camera is not available', () => {
    renderComponent();
    expect(screen.getByText(qrLoginStrings.secureContextRequired$())).toBeInTheDocument();
  });

  it('does not render the confirm modal on initial render', () => {
    renderComponent();
    expect(screen.queryByText(qrLoginStrings.isThisYou$())).not.toBeInTheDocument();
  });

  it('does not render an error alert on initial render', () => {
    renderComponent();
    expect(screen.queryByText(qrLoginStrings.wrongQRCode$())).not.toBeInTheDocument();
  });
});
