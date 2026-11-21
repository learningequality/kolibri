import { fireEvent, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import SignInPage from '../../views/SignInPage';
import { FACILITY_B, facilitiesRequested, launchSignIn, listedUsername } from './launchSignIn';

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

describe('signed-out OS user on a multi-facility device with nothing saved', () => {
  it('opens their own form in their facility, saving nothing', async () => {
    const { login, vueRouter } = await launchSignIn({
      osUser: { username: 'admin', facility: FACILITY_B.id },
    });

    expect(vueRouter.currentRoute.path).toBe('/signin');
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'admin', facility: FACILITY_B.id }),
    );
    expect(await screen.findByLabelText(coreStrings.passwordLabel$())).toBeInTheDocument();
    expect(window.localStorage.getItem('facilityId')).toBeNull();
    expect(window.localStorage.getItem('signInMethod')).toBeNull();
    expect(facilitiesRequested()).toEqual(new Set([FACILITY_B.id]));

    await fireEvent.click(screen.getByRole('button', { name: SignInPage.$trs.changeUser.message }));
    expect(
      await screen.findByRole('button', { name: listedUsername(FACILITY_B.id) }),
    ).toBeInTheDocument();
    expect(login).toHaveBeenCalledTimes(1);
  });
});
