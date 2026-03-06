import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import AuthSelect from '../AuthSelect';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/urls');

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
  store.getters = { ...store.getters, allowAccess: true };

  return render(AuthSelect, {
    store,
    routes,
  });
}

describe('user index page component', () => {
  it('shows sign in and create account options with facility selection', () => {
    renderComponent();
    const signInLink = screen.getByRole('link', { name: 'Sign in' });
    const createAccountLink = screen.getByRole('link', { name: 'Create an account' });
    expect(signInLink).toHaveAttribute('href', '#/facilities');
    expect(createAccountLink).toHaveAttribute('href', '#/facilities');
  });
});
