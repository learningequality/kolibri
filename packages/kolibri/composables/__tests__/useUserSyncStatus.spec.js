import client from 'kolibri/client';
import { fetchUserSyncStatus } from '../useUserSyncStatus';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('fetchUserSyncStatus', () => {
  it('sends the caller’s filters as query parameters and resolves the rows', async () => {
    client.__setPayload([{ status: 'SYNCING', queued: false }]);

    await expect(fetchUserSyncStatus({ user: 'user-1' })).resolves.toEqual([
      { status: 'SYNCING', queued: false },
    ]);

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', params: { user: 'user-1' } }),
    );
  });
});
