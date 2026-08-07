import client from 'kolibri/client';
import urls from 'kolibri/urls';
import PortalResource from '../PortalResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('PortalResource', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
  });

  describe('validateToken', () => {
    it('sends the token as a query parameter and resolves with the payload', async () => {
      client.__setPayload({ name: 'Test Project' });

      const result = await PortalResource.validateToken('abc-def');

      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/kolibri:core:portal_validate_token',
          params: { token: 'abc-def' },
        }),
      );
      expect(result).toEqual({ name: 'Test Project' });
    });
  });

  describe('registerFacility', () => {
    it('sends the registration payload as a POST body', async () => {
      client.__setPayload({});

      await PortalResource.registerFacility({ facility_id: 'f1', token: 't1' });

      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/kolibri:core:portal_register',
          method: 'POST',
          data: { facility_id: 'f1', token: 't1' },
        }),
      );
    });
  });
});
