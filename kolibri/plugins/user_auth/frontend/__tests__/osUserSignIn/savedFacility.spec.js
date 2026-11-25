import { screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { FACILITY_A, FACILITY_B, facilitiesRequested, launchSignIn } from './launchSignIn';

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

describe('signed-out OS user in another facility than the saved one', () => {
  it('opens their own form, keeping the saved facility and picture sign-in', async () => {
    const { login, vueRouter } = await launchSignIn({
      osUser: { username: 'admin', facility: FACILITY_B.id },
      saved: { facilityId: FACILITY_A.id, signInMethod: OptionsForSignIn.PICTURE_PASSWORD },
    });

    expect(vueRouter.currentRoute.path).toBe('/signin');
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'admin', facility: FACILITY_B.id }),
    );
    expect(await screen.findByLabelText(coreStrings.passwordLabel$())).toBeInTheDocument();
    expect(window.localStorage.getItem('facilityId')).toBe(FACILITY_A.id);
    expect(window.localStorage.getItem('signInMethod')).toBe(OptionsForSignIn.PICTURE_PASSWORD);
    expect(facilitiesRequested()).toEqual(new Set([FACILITY_B.id]));
  });
});
