import { render, screen } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { createTranslator } from 'kolibri/utils/i18n';
import pluginData from 'kolibri-plugin-data';
import AuthBase from '../AuthBase.vue';
import { userString } from '../commonUserStrings';
import useAuthFlow, { useAuthFlowMock } from '../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import { ComponentMap } from '../../constants';

const { restrictedAccess$ } = createTranslator(AuthBase.name, AuthBase.$trs);

jest.mock('kolibri/composables/useUser');
jest.mock('../../composables/useAuthFlow');
jest.mock('../../composables/useAuthRouter');
jest.mock('kolibri/urls');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: {
    allowRemoteAccess: true,
    oidcProviderEnabled: false,
    allowGuestAccess: false,
    deviceUnusableReason: null,
    loginItems: [],
  },
}));

const routes = [{ name: 'SignUpPage', path: '/signup' }];

VueRouter.prototype.getRoute = jest.fn((name, params = {}, query = {}) => ({
  name,
  params,
  query,
}));

useAuthFlow.mockReturnValue(
  useAuthFlowMock({
    facilityConfig: ref({ learner_can_sign_up: true, is_full_facility_import: true }),
    canSignUp: ref(true),
  }),
);
useAuthRouter.mockReturnValue(
  useAuthRouterMock({
    signUpRoute: ref({ name: ComponentMap.SIGN_UP, params: {}, query: {} }),
  }),
);

function renderComponent({ allowRemoteAccess = true, isAppContext = false, loginItems = [] } = {}) {
  pluginData.allowRemoteAccess = allowRemoteAccess;
  pluginData.loginItems = loginItems;
  useUser.mockImplementation(() => useUserMock({ isAppContext }));
  return render(AuthBase, {
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

  const exampleLoginItemLabel = 'Sign in with Example';

  it('renders a link for each entry in loginItems', () => {
    renderComponent({
      loginItems: [
        {
          label: exampleLoginItemLabel,
          url: '/example/login/',
          icon: '/static/icon.svg',
          appearance: 'raised-button',
        },
      ],
    });
    const link = screen.getByRole('link', { name: exampleLoginItemLabel });
    expect(link).toHaveAttribute('href', '/example/login/');
  });

  it('renders no login options when loginItems is empty', () => {
    renderComponent();
    expect(screen.queryByRole('link', { name: exampleLoginItemLabel })).not.toBeInTheDocument();
  });

  describe('shaking animation', () => {
    let originalMatchMedia;

    beforeEach(() => {
      jest.useFakeTimers('modern');
      originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
      jest.useRealTimers();
      window.matchMedia = originalMatchMedia;
    });

    function mountComponent() {
      const router = new VueRouter({ routes });
      return mount(AuthBase, {
        router,
        stubs: [
          'router-link',
          'KButton',
          'KExternalLink',
          'CoreLogo',
          'LanguageSwitcherFooter',
          'PrivacyInfoModal',
          'DeviceUnusableMessage',
        ],
      });
    }

    it('shake() sets shaking state and resolves after 800ms (normal motion)', async () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
      }));

      const wrapper = mountComponent();

      let resolved = false;
      wrapper.vm.shake().then(() => {
        resolved = true;
      });

      expect(wrapper.vm.shaking).toBe(true);
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(799);
      await Promise.resolve();
      expect(resolved).toBe(false);
      expect(wrapper.vm.shaking).toBe(true);

      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(resolved).toBe(true);
      expect(wrapper.vm.shaking).toBe(false);
    });

    it('shake() resolves after 1ms with prefers-reduced-motion', async () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
      }));

      const wrapper = mountComponent();

      let resolved = false;
      wrapper.vm.shake().then(() => {
        resolved = true;
      });

      expect(wrapper.vm.shaking).toBe(true);
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(resolved).toBe(true);
      expect(wrapper.vm.shaking).toBe(false);
    });

    it('clears timeout on destroy to prevent memory leaks', () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
      }));

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const wrapper = mountComponent();

      wrapper.vm.shake();
      wrapper.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
