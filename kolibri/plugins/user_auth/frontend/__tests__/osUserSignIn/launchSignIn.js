/* global jest */
import { render } from '@testing-library/vue';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { isNavigationFailure, NavigationFailureType } from 'vue-router';
import router from 'kolibri/router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { LoginErrors } from 'kolibri/constants';

export const FACILITY_A = { id: 'fac-a', name: 'Facility A' };
export const FACILITY_B = { id: 'fac-b', name: 'Facility B' };
const ADD_ROUTES_DEPRECATION = /addRoutes\(\) is deprecated/;
const PICTURE_PASSWORD_CONFIG = { picture_password_settings: { icon_style: 'colorful' } };

export function listedUsername(facility) {
  return `learner-of-${facility}`;
}

export function facilitiesRequested() {
  return new Set(
    client.mock.calls
      .map(([{ params = {} }]) => params.facility || params.facility_id)
      .filter(Boolean),
  );
}

function mockServer(osUser) {
  urls.__echoUrls();
  client.mockImplementation(async ({ url, params = {} }) => {
    if (url.includes('facilityusername_osuser')) {
      if (!osUser) throw new Error('404');
      return { data: osUser };
    }
    if (url.includes('facilityusername')) {
      return { data: { results: [{ username: listedUsername(params.facility) }], more: null } };
    }
    if (url.includes('facilitydataset')) {
      return { data: [PICTURE_PASSWORD_CONFIG] };
    }
    if (url.includes('facility')) {
      return { data: [FACILITY_A, FACILITY_B] };
    }
    throw new Error(`unexpected ${url}`);
  });
}

export async function launchSignIn({ osUser, saved = {} }) {
  Object.entries(saved).forEach(([key, value]) => window.localStorage.setItem(key, value));
  const login = jest.fn().mockResolvedValue({ error: LoginErrors.PASSWORD_MISSING });
  useUser.mockImplementation(() =>
    useUserMock({ isAppContext: true, isUserLoggedIn: false, userFacilityId: null, login }),
  );
  mockServer(osUser);

  /* eslint-disable global-require */
  const routes = require('../../routes').default;
  const useAuthFlow = require('../../composables/useAuthFlow').default;
  /* eslint-enable global-require */
  const { initializeFlow } = useAuthFlow();
  router.initRouter({ mode: 'abstract' });
  const realWarn = console.warn; // eslint-disable-line no-console
  const warn = jest.spyOn(console, 'warn').mockImplementation((message, ...rest) => {
    if (!ADD_ROUTES_DEPRECATION.test(message)) {
      realWarn(message, ...rest);
    }
  });
  const vueRouter = router.initRoutes(routes);
  warn.mockRestore();
  vueRouter.beforeEach(async (to, from, next) => {
    await initializeFlow();
    next();
  });
  render({ template: '<router-view />' }, { router: vueRouter });
  await vueRouter.push('/').catch(error => {
    if (!isNavigationFailure(error, NavigationFailureType.redirected)) {
      throw error;
    }
  });
  await global.flushPromises();
  return { login, vueRouter };
}
