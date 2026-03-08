import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import AuthBase from '../AuthBase';
import makeStore from '../../__tests__/utils/makeStore';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line

jest.mock('kolibri-common/composables/useFacilities');
jest.mock('kolibri/urls');

const routes = [{ name: 'SignUpPage', path: '/signup' }];

VueRouter.prototype.getRoute = jest.fn((name, params = {}, query = {}) => ({
  name,
  params,
  query,
}));

useFacilities.mockImplementation(() =>
  useFacilitiesMock({
    facilityConfig: { learner_can_sign_up: true, is_full_facility_import: true },
  }),
);

function renderComponent(allowAccess = true) {
  const store = makeStore();
  store.getters = { ...store.getters, allowAccess: allowAccess };

  return render(AuthBase, {
    store,
    routes,
  });
}

describe('auth base component', () => {
  it('shows restricted access message when access is disallowed', () => {
    renderComponent(false);
    expect(
      screen.getByText('Access to Kolibri has been restricted for external devices'),
    ).toBeInTheDocument();
  });

  it('does not show restricted access message when access is allowed', () => {
    renderComponent();
    expect(
      screen.queryByText('Access to Kolibri has been restricted for external devices'),
    ).not.toBeInTheDocument();
  });

  it('shows a create account link', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: 'Create an account' });
    expect(link).toHaveAttribute('href', '#/signup');
  });
});
