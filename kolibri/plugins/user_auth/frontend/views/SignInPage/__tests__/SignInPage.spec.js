import { render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { MAX_USERS_FOR_LISTING_VIEW } from '../../../constants';
import FacilityUsernameResource from '../../../apiResources/FacilityUsernameResource';
import SignInPage from '../index.vue';
import useAuthFlow, { useAuthFlowMock } from '../../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import useAuthWatcher from '../../../composables/useAuthWatcher';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');
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
jest.mock('kolibri-common/composables/useFacility', () => ({
  useFacilitySelect: () => ({ setSelectedFacilityId: jest.fn() }),
}));
jest.mock('../../../composables/useAuthFlow');
jest.mock('../../../composables/useAuthRouter');
jest.mock('../../../composables/useAuthWatcher');
jest.mock('vue-router/composables', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
}));
jest.mock('../../../apiResources/FacilityUsernameResource', () => ({
  __esModule: true,
  default: { fetchCollection: jest.fn() },
}));

const TEST_FACILITY = { id: 'fac-1', name: 'Test Facility' };

// useAuthFlowMock defaults selectedFacility to ref(null); always override it —
// created() reads selectedFacility.id and will throw if selectedFacility is null.
function setupMocks({ isAppContext = false } = {}) {
  useUser.mockReturnValue(useUserMock({ isAppContext, login: jest.fn() }));
  useAuthFlow.mockReturnValue(
    useAuthFlowMock({
      selectedFacility: ref(TEST_FACILITY),
      facilityId: ref(TEST_FACILITY.id),
    }),
  );
  useAuthRouter.mockReturnValue(useAuthRouterMock());
  useAuthWatcher.mockReturnValue({ watchForFacilityChange: jest.fn() });
}

describe('SignInPage – FacilityUsername pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('created() hook', () => {
    it('does not fetch usernames when not in app context', () => {
      setupMocks({ isAppContext: false });
      render(SignInPage);
      expect(FacilityUsernameResource.fetchCollection).not.toHaveBeenCalled();
    });

    it('fetches with facility id and max_results when in app context', async () => {
      setupMocks({ isAppContext: true });
      FacilityUsernameResource.fetchCollection.mockResolvedValue({
        results: [],
        more: null,
      });
      render(SignInPage);
      await waitFor(() =>
        expect(FacilityUsernameResource.fetchCollection).toHaveBeenCalledWith({
          getParams: { facility: TEST_FACILITY.id, max_results: MAX_USERS_FOR_LISTING_VIEW },
        }),
      );
    });

    it('shows users list when facility has few users', async () => {
      setupMocks({ isAppContext: true });
      FacilityUsernameResource.fetchCollection.mockResolvedValue({
        results: [{ username: 'alice' }, { username: 'bob' }],
        more: null,
      });
      const { queryByTestId } = render(SignInPage);
      await waitFor(() => expect(queryByTestId('users-list')).toBeInTheDocument());
    });

    it('does not show users list when facility has too many users', async () => {
      setupMocks({ isAppContext: true });
      FacilityUsernameResource.fetchCollection.mockResolvedValue({
        results: Array.from({ length: 10 }, (_, i) => ({
          username: `user${String(i).padStart(2, '0')}`,
        })),
        more: { cursor: 'abc' },
      });
      const { queryByTestId } = render(SignInPage);
      await waitFor(() => expect(queryByTestId('users-list')).not.toBeInTheDocument());
    });

    it('does not show users list when fetch fails', async () => {
      setupMocks({ isAppContext: true });
      FacilityUsernameResource.fetchCollection.mockRejectedValue(new Error('network'));
      const { queryByTestId } = render(SignInPage);
      await waitFor(() => expect(queryByTestId('users-list')).not.toBeInTheDocument());
    });
  });
});
