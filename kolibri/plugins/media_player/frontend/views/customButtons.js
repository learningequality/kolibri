import videojs from 'video.js';

const videojsButton = videojs.getComponent('Button');

export class ReplayButton extends videojsButton {
  buildCSSClass() {
    return `vjs-icon-replay_10 ${super.buildCSSClass()}`;
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.max(0, player.currentTime() - 10));
  }
}

ReplayButton.prototype.controlText_ = 'Replay';

export class ForwardButton extends videojsButton {
  buildCSSClass() {
    return `vjs-icon-forward_10 ${super.buildCSSClass()}`;
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
  }
}

ForwardButton.prototype.controlText_ = 'Forward';

const PlayToggle = videojs.getComponent('PlayToggle');

// Centered overlay play/pause toggle — extends PlayToggle so it inherits the
// play/pause icon switching tied to player state, but adds a distinct class
// so it can be styled separately from the small toggle in the control bar.
export class BigPlayToggle extends PlayToggle {
  buildCSSClass() {
    return `vjs-big-play-toggle ${super.buildCSSClass()}`;
  }
}
