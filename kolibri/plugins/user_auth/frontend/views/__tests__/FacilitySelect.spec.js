import { render } from '@testing-library/vue';
import useAuthFlow, { useAuthFlowMock } from '../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import FacilitySelect from '../FacilitySelect';
import UserAuthLayout from '../UserAuthLayout';
import { pageTitleStrings } from '../pageTitleStrings';
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
jest.mock('../../composables/useAuthFlow');
jest.mock('../../composables/useAuthRouter');

const PageInLayout = {
  components: { UserAuthLayout, FacilitySelect },
  template: '<UserAuthLayout><FacilitySelect /></UserAuthLayout>',
};

function renderInLayout() {
  useAuthFlow.mockReturnValue(useAuthFlowMock());
  useAuthRouter.mockReturnValue(useAuthRouterMock());
  return render(PageInLayout, {
    routes: [{ name: 'FacilitySelect', path: '/' }],
  });
}

describe('FacilitySelect', () => {
  describeAuthPageTitle(renderInLayout, pageTitleStrings.facilitySelectPageTitle$);
});
