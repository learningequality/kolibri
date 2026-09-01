import client from 'kolibri/client';
import urls from 'kolibri/urls';
import TrackProgressResource from '../TrackProgressResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('TrackProgressResource', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
  });

  it('PUTs a session update to the detail endpoint', async () => {
    client.__setPayload({ complete: true });

    const result = await TrackProgressResource.updateSession('sess-1', { progress_delta: 0.5 });

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: '/kolibri:core:trackprogress_detail/sess-1',
        data: { progress_delta: 0.5 },
      }),
    );
    expect(result).toEqual({ complete: true });
  });
});
