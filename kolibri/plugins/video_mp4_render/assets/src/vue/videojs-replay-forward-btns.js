const videojs = require('video.js');
const videojsButton = videojs.getComponent('Button');

class ReplayButton extends videojsButton {
  buildCSSClass() {
    return `vjs-icon-replay_10 ${super.buildCSSClass()}`;
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.max(0, (player.currentTime() - 10)));
  }
}

class ForwardButton extends videojsButton {
  buildCSSClass() {
    return `vjs-icon-forward_10 ${super.buildCSSClass()}`;
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.min(player.duration(), (player.currentTime() + 10)));
  }
}

module.exports = {
  ReplayButton,
  ForwardButton,
};
