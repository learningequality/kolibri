import { events } from 'kolibri-sandbox/base';
import BloomShim from './BloomShim';

describe('BloomShim', () => {
  let shim;
  let mediator;

  beforeEach(() => {
    mediator = { registerMessageHandler: jest.fn(), sendMessage: jest.fn() };
    shim = new BloomShim(mediator);
  });

  function pagesRead(overrides = {}) {
    shim.__getProgress({
      totalNumberedPages: 10,
      audioPages: 0,
      nonAudioPages: 0,
      videoPages: 0,
      lastNumberedPageRead: false,
      ...overrides,
    });
  }

  function lastStateUpdate() {
    const calls = mediator.sendMessage.mock.calls.filter(
      c => c[0].nameSpace === 'BloomPlayer' && c[0].event === events.STATEUPDATE,
    );
    return calls[calls.length - 1]?.[0].data;
  }

  it('should report pages read as progress on a state update', () => {
    // Progress reaches the main client through STATEUPDATE, the same path every
    // other shim uses.
    pagesRead({ nonAudioPages: 4 });

    expect(lastStateUpdate()).toEqual({ state: {}, progress: 0.4 });
  });

  it('should count audio, non-audio and video pages together', () => {
    pagesRead({ audioPages: 1, nonAudioPages: 2, videoPages: 2 });

    expect(lastStateUpdate().progress).toEqual(0.5);
  });

  it('should hold back from complete until the last page has been read', () => {
    pagesRead({ nonAudioPages: 10 });

    expect(lastStateUpdate().progress).toEqual(0.95);
  });

  it('should report complete once the last page has been read', () => {
    pagesRead({ nonAudioPages: 10, lastNumberedPageRead: true });
    pagesRead({ nonAudioPages: 10, lastNumberedPageRead: true });

    expect(lastStateUpdate().progress).toEqual(1);
  });

  it('should keep the progress restored from user data when no page count is reported', () => {
    shim.setUserData({ progress: 0.3 });

    pagesRead({ totalNumberedPages: 0 });

    expect(lastStateUpdate().progress).toEqual(0.3);
  });
});
