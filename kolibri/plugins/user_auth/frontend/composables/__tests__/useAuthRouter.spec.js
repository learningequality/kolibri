import { ref } from 'vue';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import router from 'kolibri/router';
import useAuthFlow from '../useAuthFlow';
import getUrlParameter from '../../views/getUrlParameter';
import { ComponentMap } from '../../constants';

jest.mock('../useAuthFlow');
jest.mock('kolibri/router', () => ({
  __esModule: true,
  default: {
    currentRoute: {
      query: {},
    },
    getRoute: jest.fn((name, params = {}, query = {}) => ({
      name,
      params,
      query,
    })),
  },
}));
jest.mock('../../views/getUrlParameter', () => jest.fn(() => ''));

describe('useAuthRouter', () => {
  function createAuthRouter(route = null) {
    let useAuthRouter;
    route = route || { query: {} };

    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      useAuthRouter = require('../useAuthRouter').default;
    });

    return useAuthRouter(route);
  }

  function mockAuthFlow({
    facilityId = null,
    hasMultipleFacilities = false,
    signInMethod = OptionsForSignIn.USERNAME_PASSWORD,
  } = {}) {
    useAuthFlow.mockReturnValue({
      facilityId: ref(facilityId),
      hasMultipleFacilities: ref(hasMultipleFacilities),
      signInMethod: ref(signInMethod),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    getUrlParameter.mockReturnValue('');
    mockAuthFlow();
  });

  describe('next routing query', () => {
    it('uses query.next from the provided route', () => {
      const { nextParam, nextQuery } = createAuthRouter({
        query: { next: '/continue' },
      });

      expect(nextParam.value).toBe('/continue');
      expect(nextQuery.value).toEqual({ next: '/continue' });
      expect(getUrlParameter).not.toHaveBeenCalled();
    });

    it('falls back to URL query parameter when route query does not include next', () => {
      getUrlParameter.mockReturnValue('/from-url');

      const { nextParam, nextQuery } = createAuthRouter();

      expect(nextParam.value).toBe('/from-url');
      expect(nextQuery.value).toEqual({ next: '/from-url' });
      expect(getUrlParameter).toHaveBeenCalledWith('next');
    });

    it('returns an empty query object when next is missing', () => {
      const { nextParam, nextQuery } = createAuthRouter();

      expect(nextParam.value).toBe('');
      expect(nextQuery.value).toEqual({});
    });
  });

  describe('route helpers', () => {
    it('builds the home route', () => {
      getUrlParameter.mockReturnValue('/after-login');

      const { homeRoute } = createAuthRouter();

      expect(homeRoute.value).toEqual({
        name: ComponentMap.AUTH_SELECT,
        params: {},
        query: { next: '/after-login' },
      });
      expect(router.getRoute).toHaveBeenCalledWith(
        ComponentMap.AUTH_SELECT,
        {},
        { next: '/after-login' },
      );
    });

    it('builds the default route to facility select when multiple facilities and no selected facility', () => {
      mockAuthFlow({
        hasMultipleFacilities: true,
        facilityId: null,
      });

      const { defaultRoute } = createAuthRouter();

      expect(defaultRoute.value).toEqual({
        name: ComponentMap.AUTH_SELECT,
        params: {},
        query: {},
      });
    });

    it('builds the default route to sign-in when facility is selected', () => {
      mockAuthFlow({
        hasMultipleFacilities: true,
        facilityId: 'f1',
        signInMethod: OptionsForSignIn.USERNAME_ONLY,
      });

      const { defaultRoute } = createAuthRouter();

      expect(defaultRoute.value).toEqual({
        name: ComponentMap.USERNAME_SIGN_IN,
        params: {},
        query: {},
      });
    });

    it('builds the default route to sign-in when multiple facilities is false', () => {
      mockAuthFlow({
        hasMultipleFacilities: false,
        facilityId: null,
        signInMethod: OptionsForSignIn.USERNAME_ONLY,
      });

      const { defaultRoute } = createAuthRouter();

      expect(defaultRoute.value).toEqual({
        name: ComponentMap.USERNAME_SIGN_IN,
        params: {},
        query: {},
      });
    });

    it('builds sign-in routes from active sign-in method', () => {
      mockAuthFlow({
        signInMethod: OptionsForSignIn.PICTURE_PASSWORD,
      });

      const { signInRoute, pictureSignInRoute, usernameSignInRoute } = createAuthRouter();

      expect(signInRoute.value).toEqual({
        name: ComponentMap.PICTURE_SIGN_IN,
        params: {},
        query: {},
      });
      expect(pictureSignInRoute.value).toEqual({
        name: ComponentMap.PICTURE_SIGN_IN,
        params: {},
        query: {},
      });
      expect(usernameSignInRoute.value).toEqual({
        name: ComponentMap.USERNAME_SIGN_IN,
        params: {},
        query: {},
      });
    });

    it('builds sign-up route', () => {
      const { signUpRoute } = createAuthRouter();

      expect(signUpRoute.value).toEqual({
        name: ComponentMap.SIGN_UP,
        params: {},
        query: {},
      });
    });

    it('builds sign-up route with next query', () => {
      getUrlParameter.mockReturnValue('/continue');

      const { signUpRoute } = createAuthRouter();

      expect(signUpRoute.value).toEqual({
        name: ComponentMap.SIGN_UP,
        params: {},
        query: { next: '/continue' },
      });
    });

    it('builds facility selection route with sign-up next and next query', () => {
      getUrlParameter.mockReturnValue('/continue');

      const { getFacilitySelectionRoute } = createAuthRouter();
      const route = getFacilitySelectionRoute(true);

      expect(route).toEqual({
        name: ComponentMap.FACILITY_SELECT,
        params: { signUpNext: true },
        query: { next: '/continue' },
      });
    });

    it('builds explicit sign-in route by name', () => {
      getUrlParameter.mockReturnValue('/continue');

      const { getSignInRoute } = createAuthRouter();
      const route = getSignInRoute(ComponentMap.USERNAME_SIGN_IN);

      expect(route).toEqual({
        name: ComponentMap.USERNAME_SIGN_IN,
        params: {},
        query: { next: '/continue' },
      });
    });
  });
});
