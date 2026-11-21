import { FACILITY_A, launchSignIn } from './launchSignIn';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: {
    allowRemoteAccess: true,
    oidcProviderEnabled: false,
    allowGuestAccess: false,
    deviceUnusableReason: null,
  },
}));

describe('no OS user to sign in', () => {
  it('opens the picture grid of a picture-password facility', async () => {
    const { login, vueRouter } = await launchSignIn({
      osUser: null,
      saved: { facilityId: FACILITY_A.id },
    });

    expect(vueRouter.currentRoute.path).toBe('/picture-signin');
    expect(login).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('signInMethod')).toBeNull();
  });
});
