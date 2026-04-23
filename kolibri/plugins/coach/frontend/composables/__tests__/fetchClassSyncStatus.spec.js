import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
import { handleApiError } from 'kolibri/utils/appError';
import { fetchClassSyncStatus } from '../fetchClassSyncStatus';

jest.mock('kolibri-common/apiResources/UserSyncStatusResource', () => ({
  __esModule: true,
  default: {
    fetchCollection: jest.fn(),
  },
}));

jest.mock('kolibri/utils/appError', () => ({
  __esModule: true,
  handleApiError: jest.fn(),
  handleError: jest.fn(),
  clearError: jest.fn(),
  error: { value: null },
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

  it('calls handleApiError and returns the error on failure', async () => {
    const error = new Error('Network error');
    UserSyncStatusResource.fetchCollection.mockRejectedValue(error);

    const result = await fetchClassSyncStatus('class-123');

    expect(handleApiError).toHaveBeenCalledWith({ error });
    expect(result).toBe(error);
  });
});
