import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import AuthSelect from '../AuthSelect';
import { userString } from '../commonUserStrings';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/useFacility');
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

function renderComponent() {
  const store = makeStore();
  return render(AuthSelect, {
    store,
    routes,
  });
}

describe('user index page component', () => {
  it('shows sign in and create account options with facility selection', () => {
    renderComponent();
    const signInLink = screen.getByRole('link', { name: coreString('signInLabel') });
    const createAccountLink = screen.getByRole('link', { name: userString('createAccountAction') });
    expect(signInLink).toHaveAttribute('href', '#/facilities');
    expect(createAccountLink).toHaveAttribute('href', '#/facilities');
  });
});
