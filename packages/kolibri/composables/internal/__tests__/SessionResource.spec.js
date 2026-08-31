import client from 'kolibri/client';
import urls from 'kolibri/urls';
import SessionResource from '../SessionResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('SessionResource', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
  });

  it('POSTs the credentials to the session list endpoint', async () => {
    client.__setPayload({ username: 'u' });

    const session = await SessionResource.login({ username: 'u', password: 'p' });

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/kolibri:core:session_list',
        data: { username: 'u', password: 'p' },
      }),
    );
    expect(session).toEqual({ username: 'u' });
  });

  it('sends prevalidate as a query parameter, never in the body', async () => {
    await SessionResource.login({ username: 'u' }, { params: { prevalidate: true } });

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { prevalidate: true },
        data: { username: 'u' },
      }),
    );
  });
});
