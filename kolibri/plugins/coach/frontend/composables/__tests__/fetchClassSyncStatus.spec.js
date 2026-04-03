import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
import store from 'kolibri/store';
import { fetchClassSyncStatus } from '../fetchClassSyncStatus';

jest.mock('kolibri-common/apiResources/UserSyncStatusResource', () => ({
  __esModule: true,
  default: {
    fetchCollection: jest.fn(),
  },
}));

jest.mock('kolibri/store', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
  },
}));

describe('fetchClassSyncStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches sync status for all members of a class', async () => {
    const mockData = [
      { user: 'user-1', status: 'SYNCING' },
      { user: 'user-2', status: 'SYNCED' },
    ];
    UserSyncStatusResource.fetchCollection.mockResolvedValue(mockData);

    const result = await fetchClassSyncStatus('class-123');

    expect(UserSyncStatusResource.fetchCollection).toHaveBeenCalledWith({
      force: true,
      getParams: { member_of: 'class-123' },
    });
    expect(result).toEqual(mockData);
  });

  it('dispatches handleApiError and returns the error on failure', async () => {
    const error = new Error('Network error');
    UserSyncStatusResource.fetchCollection.mockRejectedValue(error);

    const result = await fetchClassSyncStatus('class-123');

    expect(store.dispatch).toHaveBeenCalledWith('handleApiError', { error });
    expect(result).toBe(error);
  });
});
