import Mediator from 'kolibri-sandbox/mediator';
import { events, nameSpace } from 'kolibri-sandbox/base';
import BloomShim from './BloomShim';

describe('BloomShim', () => {
  let shim;
  let mediator;
  let sent;

  beforeEach(() => {
    sent = [];
    // Real mediator, so the tests go through the subscription the player relies on,
    // with a stub remote so the shim's own messages do not come back to it.
    mediator = new Mediator({ postMessage: message => sent.push(message) });
    shim = new BloomShim(mediator);
  });

  afterEach(() => {
    mediator.destroy();
  });

  // The shape the vendored Bloom Player fork posts to window.parent.
  async function pagesRead(overrides = {}) {
    window.postMessage(
      {
        nameSpace: 'BloomPlayer',
        event: 'Pages Read',
        data: {
          totalNumberedPages: 10,
          audioPages: 0,
          nonAudioPages: 0,
          videoPages: 0,
          lastNumberedPageRead: false,
          ...overrides,
        },
      },
      '*',
    );
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  function lastStateUpdate() {
    const updates = sent.filter(
      message => message.nameSpace === nameSpace && message.event === events.SHIMSTATEUPDATE,
    );
    return updates[updates.length - 1]?.data;
  }

  it('should report pages read as progress on a state update', async () => {
    // Progress reaches the main client through SHIMSTATEUPDATE, the same path every
    // other shim uses.
    await pagesRead({ nonAudioPages: 4 });

    expect(lastStateUpdate()).toEqual({ shim: 'BloomPlayer', state: {}, progress: 0.4 });
  });

  it('should count audio, non-audio and video pages together', async () => {
    await pagesRead({ audioPages: 1, nonAudioPages: 2, videoPages: 2 });

    expect(lastStateUpdate().progress).toEqual(0.5);
  });

  it('should hold back from complete until the last page has been read', async () => {
    await pagesRead({ nonAudioPages: 10 });
    await pagesRead({ nonAudioPages: 10 });

    expect(lastStateUpdate().progress).toEqual(0.95);
  });

  it('should report complete once the last page has been read', async () => {
    await pagesRead({ nonAudioPages: 10, lastNumberedPageRead: true });
    expect(lastStateUpdate().progress).toEqual(0.95);

    await pagesRead({ nonAudioPages: 10, lastNumberedPageRead: true });

    expect(lastStateUpdate().progress).toEqual(1);
  });

  it('should keep the progress restored from user data when no page count is reported', async () => {
    shim.setUserData({ progress: 0.3 });

    await pagesRead({ totalNumberedPages: 0 });

    expect(lastStateUpdate().progress).toEqual(0.3);
  });
});
