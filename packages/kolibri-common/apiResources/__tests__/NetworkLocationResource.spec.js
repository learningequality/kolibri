import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { NetworkLocationResource } from '../NetworkLocationResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('NetworkLocationResource', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
  });

  describe('fetchFacilities', () => {
    it('reads the facilities of one device, not of every device', async () => {
      client.__setPayload({ facilities: [{ id: 'f1' }] });

      const result = await NetworkLocationResource.fetchFacilities('dev-1');

      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/kolibri:core:networklocation_facilities_detail/dev-1' }),
      );
      expect(result).toEqual({ facilities: [{ id: 'f1' }] });
    });
  });

  describe('updateConnectionStatus', () => {
    it('POSTs to the connection-status action of one device', async () => {
      client.__setPayload({ id: 'dev-1', connection_status: 'Okay' });

      const result = await NetworkLocationResource.updateConnectionStatus('dev-1');

      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/kolibri:core:networklocation_update_connection_status/dev-1',
          method: 'POST',
        }),
      );
      expect(result).toEqual({ id: 'dev-1', connection_status: 'Okay' });
    });
  });
});
