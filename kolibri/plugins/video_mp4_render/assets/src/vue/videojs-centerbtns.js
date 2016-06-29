const videojs = require('video.js');
const videojsButton = videojs.getComponent('Button');

class ReplayButton extends videojsButton {
  buildCSSClass() {
    return 'vjs-control vjs-button videoreplay';
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.max(0, (player.currentTime() - 10)));
  }
}

class ForwardButton extends videojsButton {
  buildCSSClass() {
    return 'vjs-control vjs-button videoforward';
  }
  handleClick() {
    const player = this.player();
    player.currentTime(Math.min(player.duration(), (player.currentTime() + 10)));
  }
}

class TogglePlayButton extends videojsButton {
  buildCSSClass() {
    return 'vjs-control vjs-button videotoggle';
  }
  handleClick() {
    const player = this.player();
    this.toggleClass('videopaused');
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
  }
}

videojs.registerComponent('ReplayButton', ReplayButton);
videojs.registerComponent('ForwardButton', ForwardButton);
videojs.registerComponent('TogglePlayButton', TogglePlayButton);
