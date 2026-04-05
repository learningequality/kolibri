import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';

jest.mock('kolibri-common/apiResources/UserSyncStatusResource', () => ({
  __esModule: true,
  default: {
    fetchCollection: jest.fn(),
  },
}));

// Must mock appError before importing fetchClassSyncStatus,
// since it imports named exports at module level.
const mockHandleApiError = jest.fn();
jest.mock('kolibri/utils/appError', () => ({
  __esModule: true,
  handleApiError: mockHandleApiError,
  handleError: jest.fn(),
  clearError: jest.fn(),
  error: { value: null },
}));

// Import after mocks are set up
const { fetchClassSyncStatus } = require('../fetchClassSyncStatus');

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

    expect(mockHandleApiError).toHaveBeenCalledWith({ error });
    expect(result).toBe(error);
  });
});
