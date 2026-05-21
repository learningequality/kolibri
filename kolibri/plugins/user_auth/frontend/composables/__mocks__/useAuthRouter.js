import { computed } from 'vue';
import { ComponentMap } from '../../constants';

const MOCK_DEFAULTS = {
  router: {},
  nextParam: computed(() => ''),
  nextQuery: computed(() => ({})),
  homeRoute: computed(() => ({ name: ComponentMap.AUTH_SELECT, params: {}, query: {} })),
  defaultRoute: computed(() => ({ name: ComponentMap.USERNAME_SIGN_IN, params: {}, query: {} })),
  signInRoute: computed(() => ({ name: ComponentMap.USERNAME_SIGN_IN, params: {}, query: {} })),
  pictureSignInRoute: computed(() => ({
    name: ComponentMap.PICTURE_SIGN_IN,
    params: {},
    query: {},
  })),
  usernameSignInRoute: computed(() => ({
    name: ComponentMap.USERNAME_SIGN_IN,
    params: {},
    query: {},
  })),
  signUpRoute: computed(() => ({ name: ComponentMap.SIGN_UP, params: {}, query: {} })),
  getFacilitySelectionRoute: jest.fn(),
  getSignInRoute: jest.fn(),
};

export function useAuthRouterMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useAuthRouterMock());
