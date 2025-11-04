import client from 'kolibri/client';
import MembershipResource from '../MembershipResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('MembershipResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCollection', () => {
    it('should call client with POST method to collectionUrl', async () => {
      const mockData = [{ user: 'user1', collection: 'class1' }];
      const mockResponse = {
        data: { created: [{ id: 'membership1', user: 'user1', collection: 'class1' }] },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      await MembershipResource.saveCollection({ data: mockData });

      expect(client).toHaveBeenCalledTimes(1);
      expect(client).toHaveBeenCalledWith({
        url: MembershipResource.collectionUrl(),
        method: 'POST',
        params: {},
        data: mockData,
      });
    });

    it('should handle successful response with 201 status', async () => {
      const mockData = [
        { user: 'user1', collection: 'class1' },
        { user: 'user2', collection: 'class1' },
      ];
      const mockResponse = {
        data: {
          created: [
            { id: 'membership1', user: 'user1', collection: 'class1' },
            { id: 'membership2', user: 'user2', collection: 'class1' },
          ],
        },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      const result = await MembershipResource.saveCollection({ data: mockData });

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe(201);
      expect(result.data.created).toHaveLength(2);
    });

    it('should handle partial success response with 207 status', async () => {
      const mockData = [
        { user: 'user1', collection: 'class1' },
        { user: 'user2', collection: 'class1' },
      ];
      const mockResponse = {
        data: {
          created: [{ id: 'membership1', user: 'user1', collection: 'class1' }],
          failed: [{ user: 'user2', collection: 'class1', error: 'Already exists' }],
        },
        status: 207,
      };

      client.mockResolvedValue(mockResponse);

      const result = await MembershipResource.saveCollection({ data: mockData });

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe(207);
      expect(result.data.created).toHaveLength(1);
      expect(result.data.failed).toHaveLength(1);
    });

    it('should pass getParams to client', async () => {
      const mockData = [{ user: 'user1', collection: 'class1' }];
      const mockGetParams = { user_id: 'user1' };
      const mockResponse = {
        data: { created: [{ id: 'membership1', user: 'user1', collection: 'class1' }] },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      await MembershipResource.saveCollection({ data: mockData, getParams: mockGetParams });

      expect(client).toHaveBeenCalledWith({
        url: MembershipResource.collectionUrl(),
        method: 'POST',
        params: mockGetParams,
        data: mockData,
      });
    });

    it('should handle empty data array', async () => {
      const mockResponse = {
        data: { created: [] },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      const result = await MembershipResource.saveCollection({ data: [] });

      expect(client).toHaveBeenCalledWith({
        url: MembershipResource.collectionUrl(),
        method: 'POST',
        params: {},
        data: [],
      });
      expect(result.data.created).toHaveLength(0);
    });

    it('should handle client errors', async () => {
      const mockData = [{ user: 'user1', collection: 'class1' }];
      const mockError = {
        response: { status: 500, data: { error: 'Server error' } },
      };

      client.mockRejectedValue(mockError);

      await expect(MembershipResource.saveCollection({ data: mockData })).rejects.toEqual(
        mockError,
      );
    });

    it('should use default values when no parameters provided', async () => {
      const mockResponse = {
        data: { created: [] },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      await MembershipResource.saveCollection();

      expect(client).toHaveBeenCalledWith({
        url: MembershipResource.collectionUrl(),
        method: 'POST',
        params: {},
        data: [],
      });
    });
  });

  describe('saveModel', () => {
    it('should use default Resource behavior for creating new model', async () => {
      const mockData = { user: 'user1', collection: 'class1' };
      const mockResponse = {
        data: { id: 'membership1', ...mockData },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      const result = await MembershipResource.saveModel({ data: mockData });

      expect(client).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should use default Resource behavior for updating existing model', async () => {
      const mockId = 'membership1';
      const mockData = { collection: 'class2' };
      const mockResponse = {
        data: { id: mockId, user: 'user1', collection: 'class2' },
        status: 200,
      };

      client.mockResolvedValue(mockResponse);

      const result = await MembershipResource.saveModel({
        id: mockId,
        data: mockData,
        exists: true,
      });

      expect(client).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
