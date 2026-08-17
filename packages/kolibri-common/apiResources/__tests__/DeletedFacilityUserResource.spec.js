import client from 'kolibri/client';
import DeletedFacilityUserResource from '../DeletedFacilityUserResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('DeletedFacilityUserResource', () => {
  beforeEach(() => {
    client.__reset();
  });

  describe('restoreCollection', () => {
    it('resolves with the response payload, not the response envelope', async () => {
      client.__setPayload({ restored: 2 });

      await expect(
        DeletedFacilityUserResource.restoreCollection({ by_ids: 'a,b' }),
      ).resolves.toEqual({ restored: 2 });
    });

    it('POSTs the filter as query parameters', async () => {
      await DeletedFacilityUserResource.restoreCollection({ by_ids: 'a,b' });

      expect(client).toHaveBeenCalledTimes(1);
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', params: { by_ids: 'a,b' } }),
      );
    });

    it.each([[undefined], [{}]])(
      'refuses %p, which would restore every deleted user',
      async params => {
        await expect(DeletedFacilityUserResource.restoreCollection(params)).rejects.toThrow();

        expect(client).not.toHaveBeenCalled();
      },
    );
  });
});
