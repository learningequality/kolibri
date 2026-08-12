import { nextTick } from 'vue';
import client from 'kolibri/client';
import { error as appError, clearError } from 'kolibri/utils/appError';
import { useRoute, useRouter } from 'vue-router/composables';
import useUserManagement from '../useUserManagement';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('vue-router/composables');

const SERVER_ERROR_MESSAGE = 'Request failed with status code 500';

describe('useUserManagement', () => {
  let router;

  function setup({ query = {} } = {}) {
    router = { push: jest.fn() };
    useRoute.mockReturnValue({ query });
    useRouter.mockReturnValue(router);
    return useUserManagement({ activeFacilityId: 'facility-1' });
  }

  beforeEach(() => {
    client.__reset();
    clearError();
  });

  it('exposes the paginated response as mapped users and page counts', async () => {
    client.__setPayload({
      results: [{ id: 'user-1', full_name: 'Test User', facility: 'facility-1', roles: [] }],
      count: 1,
      total_pages: 3,
    });

    const { fetchUsers, facilityUsers, usersCount, totalPages } = setup();
    await fetchUsers();

    expect(facilityUsers.value).toEqual([
      expect.objectContaining({ id: 'user-1', full_name: 'Test User', facility_id: 'facility-1' }),
    ]);
    expect(usersCount.value).toBe(1);
    expect(totalPages.value).toBe(3);
  });

  it('falls back to the first page when a stale page number 404s', async () => {
    // A bare `status`, not an axios-shaped error: the composable branches on `error.status`, and
    // `logError` only stays quiet while `config` and `response` are both absent.
    client.mockRejectedValue({ status: 404 });

    const { fetchUsers } = setup({ query: { page: '2' } });
    await fetchUsers();
    // The handler is a watcher on the `error` ref, so the awaited fetch alone does not reach it.
    await nextTick();

    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ page: 1 }) }),
    );
    expect(appError.value).toBeNull();
  });

  it('reports any other failure without throwing out of the watcher', async () => {
    client.mockRejectedValue({ status: 500, message: SERVER_ERROR_MESSAGE });

    const { fetchUsers } = setup();
    await fetchUsers();
    await nextTick();

    // A throw from the watcher hits Vue's error handler, which the suite's console rules fail on.
    expect(appError.value).toContain(SERVER_ERROR_MESSAGE);
    expect(router.push).not.toHaveBeenCalled();
  });
});
