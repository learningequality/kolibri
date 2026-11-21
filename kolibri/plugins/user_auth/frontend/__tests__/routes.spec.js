import { computed } from 'vue';
import {
  useFacilityConfig,
  // eslint-disable-next-line import-x/named
  useFacilityConfigMock,
  // eslint-disable-next-line import-x/named
  selectedFacilityId,
} from 'kolibri-common/composables/useFacility';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { ComponentMap } from '../constants';

jest.mock('kolibri-common/composables/useFacilities');
jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: {},
}));

describe('sign-in routes', () => {
  async function enterSignInPage(query) {
    let routes;
    let useAuthFlow;
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      routes = require('../routes').default;
      // eslint-disable-next-line global-require
      useAuthFlow = require('../composables/useAuthFlow').default;
    });
    const signInRoute = routes.find(route => route.path === '/signin');
    const next = jest.fn();
    await signInRoute.beforeEnter(
      { name: ComponentMap.USERNAME_SIGN_IN, params: {}, query },
      {},
      next,
    );
    return { next, signInMethod: useAuthFlow().signInMethod };
  }

  beforeEach(() => {
    selectedFacilityId.value = 'facility_1';
    useFacilityConfig.mockReturnValue(
      useFacilityConfigMock({
        signInOptions: computed(() => [
          OptionsForSignIn.PICTURE_PASSWORD,
          OptionsForSignIn.USERNAME_ONLY,
        ]),
      }),
    );
    window.localStorage.setItem('signInMethod', OptionsForSignIn.PICTURE_PASSWORD);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('keeps picture sign-in saved when the OS user is sent to their form', async () => {
    const { next, signInMethod } = await enterSignInPage({ keepSavedSignInMethod: true });

    expect(next).toHaveBeenCalledWith();
    expect(signInMethod.value).toBe(OptionsForSignIn.USERNAME_ONLY);
    expect(window.localStorage.getItem('signInMethod')).toBe(OptionsForSignIn.PICTURE_PASSWORD);
  });

  it("keeps picture sign-in saved when the OS user's form is reloaded", async () => {
    await enterSignInPage({ keepSavedSignInMethod: true });
    const { next } = await enterSignInPage({ keepSavedSignInMethod: 'true' });

    expect(next).toHaveBeenCalledWith();
    expect(window.localStorage.getItem('signInMethod')).toBe(OptionsForSignIn.PICTURE_PASSWORD);
  });

  it('saves username sign-in when the user chooses it', async () => {
    const { next, signInMethod } = await enterSignInPage({});

    expect(next).toHaveBeenCalledWith();
    expect(signInMethod.value).toBe(OptionsForSignIn.USERNAME_ONLY);
    expect(window.localStorage.getItem('signInMethod')).toBe(OptionsForSignIn.USERNAME_ONLY);
  });
});
