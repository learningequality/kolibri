import videojs from 'video.js';
import mediaStrings from '../utils/mediaStrings';

const videojsButton = videojs.getComponent('Button');

export class ReplayButton extends videojsButton {
  constructor(...args) {
    super(...args);
    // Set the accessible tooltip at construction time so it is translated
    // (evaluating the translator at instantiation, after i18n is initialized).
    this.controlText(mediaStrings.replay$());
  }
  buildCSSClass() {
    return `vjs-icon-replay_10 ${super.buildCSSClass()}`;
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.max(0, player.currentTime() - 10));
  }
}

export class ForwardButton extends videojsButton {
  constructor(...args) {
    super(...args);
    this.controlText(mediaStrings.forward$());
  }
  buildCSSClass() {
    return `vjs-icon-forward_10 ${super.buildCSSClass()}`;
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
  }
}

const PlayToggle = videojs.getComponent('PlayToggle');

// Centered overlay play/pause toggle — extends PlayToggle so it inherits the
// play/pause icon switching tied to player state, but adds a distinct class
// so it can be styled separately from the small toggle in the control bar.
export class BigPlayToggle extends PlayToggle {
  buildCSSClass() {
    return `vjs-big-play-toggle ${super.buildCSSClass()}`;
  }
}
