import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import { createTranslator } from 'kolibri/utils/i18n';
import pluginData from 'kolibri-plugin-data';
import AuthBase from '../AuthBase.vue';
import { userString } from '../commonUserStrings';
import makeStore from '../../__tests__/utils/makeStore';

const { restrictedAccess$ } = createTranslator(AuthBase.name, AuthBase.$trs);

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

const routes = [{ name: 'SignUpPage', path: '/signup' }];

VueRouter.prototype.getRoute = jest.fn((name, params = {}, query = {}) => ({
  name,
  params,
  query,
}));

useFacility.mockReturnValue(
  useFacilityMock({
    facilityConfig: ref({ learner_can_sign_up: true, is_full_facility_import: true }),
  }),
);

function renderComponent({ allowRemoteAccess = true, isAppContext = false } = {}) {
  pluginData.allowRemoteAccess = allowRemoteAccess;
  useUser.mockImplementation(() => useUserMock({ isAppContext }));
  const store = makeStore();
  return render(AuthBase, {
    store,
    routes,
  });
}

describe('auth base component', () => {
  it('shows restricted access message when remote access is disallowed and not app context', () => {
    renderComponent({ allowRemoteAccess: false, isAppContext: false });
    expect(screen.getByText(restrictedAccess$())).toBeInTheDocument();
  });

  it('does not show restricted access message when remote access is allowed', () => {
    renderComponent({ allowRemoteAccess: true, isAppContext: false });
    expect(screen.queryByText(restrictedAccess$())).not.toBeInTheDocument();
  });

  it('does not show restricted access message in app context even when remote access is disallowed', () => {
    renderComponent({ allowRemoteAccess: false, isAppContext: true });
    expect(screen.queryByText(restrictedAccess$())).not.toBeInTheDocument();
  });

  it('shows a create account link', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: userString('createAccountAction') });
    expect(link).toHaveAttribute('href', '#/signup');
  });
});
