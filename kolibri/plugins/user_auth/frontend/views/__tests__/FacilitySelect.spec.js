import { render, screen } from '@testing-library/vue';
import { nextTick } from 'vue';
import themeConfig from 'kolibri/styles/themeConfig';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import { AuthFlowStore } from '../../composables/useAuthFlow';
import useAuthRouter, { useAuthRouterMock } from '../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import FacilitySelect from '../FacilitySelect';
import UserAuthLayout from '../UserAuthLayout';
import { userString } from '../commonUserStrings';
import describeAuthPageTitle from './describeAuthPageTitle';

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
jest.mock('../../composables/useAuthRouter');

AuthFlowStore.stub();

const PageInLayout = {
  components: { UserAuthLayout, FacilitySelect },
  props: { signUpNext: Boolean },
  template: '<UserAuthLayout><FacilitySelect :signUpNext="signUpNext" /></UserAuthLayout>',
};

function renderInLayout(props = {}) {
  AuthFlowStore.mock({ facilities: [], facilityId: null });
  useAuthRouter.mockReturnValue(useAuthRouterMock());
  return render(PageInLayout, {
    props,
    routes: [{ name: 'FacilitySelect', path: '/' }],
  });
}

describe('FacilitySelect', () => {
  describe('signing in', () => {
    describeAuthPageTitle(renderInLayout, () => coreString('facilitiesLabel'));
  });

  describe('signing up', () => {
    afterEach(() => {
      delete themeConfig.signIn.showTitle;
    });

    it('titles the page with the sign-up heading', async () => {
      themeConfig.signIn.showTitle = false;
      renderInLayout({ signUpNext: true });
      await nextTick();
      const title = userString('createAccountAction');
      expect(document.title).toBe(`${title} - Kolibri`);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    });
  });
});
