import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import client from 'kolibri/client';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { MAX_USERS_FOR_LISTING_VIEW } from '../../../constants';
import SignInPage from '../index.vue';
import useAuthFlow, { useAuthFlowMock } from '../../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import useAuthWatcher from '../../../composables/useAuthWatcher';

jest.mock('kolibri/client');
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

const { usernameLabel$ } = coreStrings;

const TEST_FACILITY = { id: 'fac-1', name: 'Test Facility' };
const SUGGESTED_USERNAME = 'alice';
const SEARCHED_TERM = SUGGESTED_USERNAME.slice(0, 3);

// created() dereferences selectedFacility.id, and useAuthFlowMock defaults it to ref(null).
function setupMocks({ isAppContext = false, facilityConfig = {} } = {}) {
  useUser.mockReturnValue(useUserMock({ isAppContext, login: jest.fn() }));
  useAuthFlow.mockReturnValue(
    useAuthFlowMock({
      selectedFacility: ref(TEST_FACILITY),
      facilityId: ref(TEST_FACILITY.id),
      facilityConfig: ref(facilityConfig),
    }),
  );
  useAuthRouter.mockReturnValue(useAuthRouterMock());
  useAuthWatcher.mockReturnValue({ watchForFacilityChange: jest.fn() });
}

describe('SignInPage – FacilityUsername reads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.__reset();
  });

  describe('app context user list', () => {
    it('does not fetch usernames when not in app context', () => {
      setupMocks({ isAppContext: false });
      render(SignInPage);
      expect(client).not.toHaveBeenCalled();
    });

    it('fetches with facility id and max_results when in app context', async () => {
      setupMocks({ isAppContext: true });
      // `__setPayload` calls `mockReset()`, so it has to precede `render`.
      client.__setPayload({ results: [], more: null });
      render(SignInPage);
      await waitFor(() =>
        expect(client).toHaveBeenCalledWith(
          expect.objectContaining({
            params: { facility: TEST_FACILITY.id, max_results: MAX_USERS_FOR_LISTING_VIEW },
          }),
        ),
      );
    });

    it('shows users list when facility has few users', async () => {
      setupMocks({ isAppContext: true });
      client.__setPayload({
        results: [{ username: 'alice' }, { username: 'bob' }],
        more: null,
      });
      const { queryByTestId } = render(SignInPage);
      await waitFor(() => expect(queryByTestId('users-list')).toBeInTheDocument());
    });

    it('does not show users list when facility has too many users', async () => {
      setupMocks({ isAppContext: true });
      client.__setPayload({
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
      client.mockRejectedValue(new Error('network'));
      const { queryByTestId } = render(SignInPage);
      await waitFor(() => expect(queryByTestId('users-list')).not.toBeInTheDocument());
    });
  });

  describe('username suggestions', () => {
    it('searches on the typed term and lists the matching usernames', async () => {
      setupMocks({
        isAppContext: false,
        facilityConfig: { learner_can_login_with_no_password: true },
      });
      client.__setPayload({ results: [{ username: SUGGESTED_USERNAME }], more: null });
      render(SignInPage);
      const usernameInput = await screen.findByRole('textbox', { name: usernameLabel$() });

      await fireEvent.update(usernameInput, SEARCHED_TERM);

      await waitFor(() =>
        expect(client).toHaveBeenCalledWith(
          expect.objectContaining({
            params: { facility: TEST_FACILITY.id, search: SEARCHED_TERM },
          }),
        ),
      );
      expect(await screen.findByText(SUGGESTED_USERNAME)).toBeInTheDocument();
    });
  });
});
