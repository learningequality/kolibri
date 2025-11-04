import client from 'kolibri/client';
import RoleResource from '../RoleResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('RoleResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCollection', () => {
    it('should call client with POST method to collectionUrl', async () => {
      const mockData = [{ user: 'user1', collection: 'class1', kind: 'coach' }];
      const mockResponse = {
        data: { created: [{ id: 'role1', user: 'user1', collection: 'class1', kind: 'coach' }] },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      await RoleResource.saveCollection({ data: mockData });

      expect(client).toHaveBeenCalledTimes(1);
      expect(client).toHaveBeenCalledWith({
        url: RoleResource.collectionUrl(),
        method: 'POST',
        params: {},
        data: mockData,
      });
    });

    it('should handle successful response with 201 status', async () => {
      const mockData = [
        { user: 'user1', collection: 'class1', kind: 'coach' },
        { user: 'user2', collection: 'class1', kind: 'coach' },
      ];
      const mockResponse = {
        data: {
          created: [
            { id: 'role1', user: 'user1', collection: 'class1', kind: 'coach' },
            { id: 'role2', user: 'user2', collection: 'class1', kind: 'coach' },
          ],
        },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      const result = await RoleResource.saveCollection({ data: mockData });

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe(201);
      expect(result.data.created).toHaveLength(2);
    });

    it('should handle partial success response with 207 status', async () => {
      const mockData = [
        { user: 'user1', collection: 'class1', kind: 'coach' },
        { user: 'user2', collection: 'class1', kind: 'coach' },
      ];
      const mockResponse = {
        data: {
          created: [{ id: 'role1', user: 'user1', collection: 'class1', kind: 'coach' }],
          failed: [{ user: 'user2', collection: 'class1', kind: 'coach', error: 'Already exists' }],
        },
        status: 207,
      };

      client.mockResolvedValue(mockResponse);

      const result = await RoleResource.saveCollection({ data: mockData });

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe(207);
      expect(result.data.created).toHaveLength(1);
      expect(result.data.failed).toHaveLength(1);
    });

    it('should pass getParams to client', async () => {
      const mockData = [{ user: 'user1', collection: 'class1', kind: 'coach' }];
      const mockGetParams = { facility: 'facility1' };
      const mockResponse = {
        data: { created: [{ id: 'role1', user: 'user1', collection: 'class1', kind: 'coach' }] },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      await RoleResource.saveCollection({ data: mockData, getParams: mockGetParams });

      expect(client).toHaveBeenCalledWith({
        url: RoleResource.collectionUrl(),
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

      const result = await RoleResource.saveCollection({ data: [] });

      expect(client).toHaveBeenCalledWith({
        url: RoleResource.collectionUrl(),
        method: 'POST',
        params: {},
        data: [],
      });
      expect(result.data.created).toHaveLength(0);
    });

    it('should handle client errors', async () => {
      const mockData = [{ user: 'user1', collection: 'class1', kind: 'coach' }];
      const mockError = {
        response: { status: 500, data: { error: 'Server error' } },
      };

      client.mockRejectedValue(mockError);

      await expect(RoleResource.saveCollection({ data: mockData })).rejects.toEqual(mockError);
    });

    it('should use default values when no parameters provided', async () => {
      const mockResponse = {
        data: { created: [] },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      await RoleResource.saveCollection();

      expect(client).toHaveBeenCalledWith({
        url: RoleResource.collectionUrl(),
        method: 'POST',
        params: {},
        data: [],
      });
    });
  });

  describe('saveModel', () => {
    it('should use default Resource behavior for creating new model', async () => {
      const mockData = { user: 'user1', collection: 'class1', kind: 'coach' };
      const mockResponse = {
        data: { id: 'role1', ...mockData },
        status: 201,
      };

      client.mockResolvedValue(mockResponse);

      const result = await RoleResource.saveModel({ data: mockData });

      expect(client).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should use default Resource behavior for updating existing model', async () => {
      const mockId = 'role1';
      const mockData = { kind: 'admin' };
      const mockResponse = {
        data: { id: mockId, user: 'user1', collection: 'class1', kind: 'admin' },
        status: 200,
      };

      client.mockResolvedValue(mockResponse);

      const result = await RoleResource.saveModel({ id: mockId, data: mockData, exists: true });

      expect(client).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
