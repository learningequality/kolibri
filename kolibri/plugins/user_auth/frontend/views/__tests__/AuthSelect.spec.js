import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { ref } from 'vue';
import useAuthFlow, { useAuthFlowMock } from '../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import AuthSelect from '../AuthSelect';
import UserAuthLayout from '../UserAuthLayout';
import { userString } from '../commonUserStrings';
import { pageTitleStrings } from '../pageTitleStrings';
import { ComponentMap } from '../../constants';
import describeAuthPageTitle from './describeAuthPageTitle';

const { signInLabel$ } = coreStrings;

jest.mock('kolibri/composables/useUser');
jest.mock('../../composables/useAuthFlow');
jest.mock('../../composables/useAuthRouter');
jest.mock('kolibri/router', () => ({
  __esModule: true,
  default: {
    getRoute: jest.fn(routeName => {
      if (routeName === 'FacilitySelect') {
        return { name: routeName, path: '/facilities' };
      }
      return { name: routeName, path: '/signin' };
    }),
  },
}));
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

const routes = [
  { name: 'SignInPage', path: '/signin' },
  { name: 'SignUpPage', path: '/signup' },
  { name: 'FacilitySelect', path: '/facilities' },
];

VueRouter.prototype.getRoute = jest.fn((name, params = {}, query = {}) => ({
  name,
  params,
  query,
}));

function setupMocks({ canSignUpWithAnyFacility = true } = {}) {
  useAuthFlow.mockReturnValue(
    useAuthFlowMock({
      hasMultipleFacilities: ref(true),
      canSignUpWithAnyFacility: ref(canSignUpWithAnyFacility),
    }),
  );
  useAuthRouter.mockReturnValue(
    useAuthRouterMock({
      signInRoute: ref({ name: ComponentMap.USERNAME_SIGN_IN, params: {}, query: {} }),
      signUpRoute: ref({ name: ComponentMap.SIGN_UP, params: {}, query: {} }),
      getFacilitySelectionRoute: jest.fn(signUpNext => ({
        name: ComponentMap.FACILITY_SELECT,
        params: { signUpNext },
        query: {},
      })),
    }),
  );
}

function renderComponent() {
  setupMocks();
  return render(AuthSelect, {
    routes,
  });
}

describe('user index page component', () => {
  it('shows sign in and create account options with facility selection', () => {
    renderComponent();
    const signInLink = screen.getByRole('link', { name: signInLabel$() });
    const createAccountLink = screen.getByRole('link', { name: userString('createAccountAction') });
    expect(signInLink).toHaveAttribute('href', '#/facilities');
    expect(createAccountLink).toHaveAttribute('href', '#/facilities');
  });
});

describe('AuthSelect in UserAuthLayout', () => {
  const PageInLayout = {
    components: { UserAuthLayout, AuthSelect },
    template: '<UserAuthLayout><AuthSelect /></UserAuthLayout>',
  };

  function renderInLayout(options) {
    setupMocks(options);
    return render(PageInLayout, { routes });
  }

  describeAuthPageTitle(renderInLayout, pageTitleStrings.authSelectPageTitle$);

  describe('when no facility allows sign-up', () => {
    describeAuthPageTitle(
      () => renderInLayout({ canSignUpWithAnyFacility: false }),
      pageTitleStrings.signInPageTitle$,
    );
  });
});
