import { fireEvent, screen } from '@testing-library/vue';
import { ComponentMap } from '../../constants';
import { FACILITY_A, FACILITY_B, launchSignIn } from './launchSignIn';

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

describe('signed-out OS user who picks another facility', () => {
  it('opens the picture grid of the picked picture-password facility', async () => {
    const { vueRouter } = await launchSignIn({
      osUser: { username: 'admin', facility: FACILITY_B.id },
    });

    await vueRouter.push({ name: ComponentMap.FACILITY_SELECT, params: { signUpNext: false } });
    await fireEvent.click(await screen.findByRole('button', { name: FACILITY_A.name }));
    await global.flushPromises();

    expect(vueRouter.currentRoute.path).toBe('/picture-signin');
  });
});
