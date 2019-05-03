import videojs from 'video.js';

const Button = videojs.getComponent('Button');
const FullscreenToggle = videojs.getComponent('FullscreenToggle');

class MimicFullscreenToggle extends FullscreenToggle {
  constructor(player, options) {
    super(player, options);

    this.handleChangeFullscreen(false);
  }

  buildCSSClass() {
    return `vjs-mimic-fullscreen-control ${Button.prototype.buildCSSClass.call(this)}`;
  }

  handleClick() {
    this.trigger('changeFullscreen');
  }

  handleChangeFullscreen(isFullscreen) {
    let el = this.$('.vjs-icon-placeholder'),
      addClass = MimicFullscreenToggle.INACTIVE_CLASS,
      removeClass = MimicFullscreenToggle.ACTIVE_CLASS,
      controlText = 'Fullscreen';

    if (isFullscreen) {
      addClass = MimicFullscreenToggle.ACTIVE_CLASS;
      removeClass = MimicFullscreenToggle.INACTIVE_CLASS;
      controlText = 'Non-Fullscreen';
    }

    videojs.dom.addClass(el, addClass);
    videojs.dom.removeClass(el, removeClass);
    this.controlText(controlText);
  }
}

MimicFullscreenToggle.ACTIVE_CLASS = 'vjs-icon-fullscreen-exit';
MimicFullscreenToggle.INACTIVE_CLASS = 'vjs-icon-fullscreen-enter';

export default MimicFullscreenToggle;
