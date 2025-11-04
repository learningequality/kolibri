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
