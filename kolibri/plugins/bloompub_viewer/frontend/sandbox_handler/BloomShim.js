/**
 * Bloom Player shim for progress tracking.
 *
 * This shim handles the BLOOMPAGESREAD event to calculate progress
 * based on pages read in Bloom content.
 */
import SandboxShim from 'kolibri-sandbox/SandboxShim';

export default class BloomShim extends SandboxShim {
  static shimName = 'BloomPlayer';

  static consumesUserData = true;

  // Bloom Player's own analytics event name - the space is theirs.
  static events = {
    BLOOMPAGESREAD: 'Pages Read',
  };

  constructor(mediator) {
    super(mediator);
    this._hasBeenFlaggedAsComplete = false;
    this.__getProgress = this.__getProgress.bind(this);
    this.on(this.events.BLOOMPAGESREAD, this.__getProgress);
  }

  __getProgress(data = {}) {
    let progress = this.userData.progress || 0;
    if (data.totalNumberedPages) {
      progress = (data.audioPages + data.nonAudioPages + data.videoPages) / data.totalNumberedPages;
      if (!this._hasBeenFlaggedAsComplete && progress >= 1) {
        progress = 0.95;
      }
      this._hasBeenFlaggedAsComplete = data.lastNumberedPageRead;
      this.userData.progress = progress;
    }
    this.stateUpdated();
  }

  getProgress() {
    return this.userData.progress || null;
  }

  // eslint-disable-next-line no-unused-vars
  iframeInitialize(contentWindow) {
    // Bloom Player doesn't need special window patching like H5P
    // The BloomRunner handles setting up the player
  }
}
