import client from 'kolibri/client';
import urls from 'kolibri/urls';
import MasteryLogResource from '../MasteryLogResource';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

describe('MasteryLogResource', () => {
  beforeEach(() => {
    client.__reset();
    urls.__echoUrls();
  });

  describe('fetchMostRecentDiff', () => {
    it('sends the try index in the URL and the rest as query parameters', async () => {
      client.__setPayload({ diff: { correct: 1 } });

      const result = await MasteryLogResource.fetchMostRecentDiff({
        content: 'c1',
        user: 'u1',
        back: 2,
        complete: true,
        quiz: true,
      });

      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/kolibri:core:masterylog_diff/2',
          params: { content: 'c1', user: 'u1', complete: true, quiz: true },
        }),
      );
      expect(result).toEqual({ diff: { correct: 1 } });
    });
  });
});
