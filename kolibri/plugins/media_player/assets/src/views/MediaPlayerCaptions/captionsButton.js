import videojs from 'video.js';
import trackUtils from '../../utils/track';
import CaptionsMenu from './captionsMenu';
import CaptionsMenuItem from './captionsMenuItem';

const TextTrackButton = videojs.getComponent('TextTrackButton');

/**
 * The Component for the Button that will open the CaptionsMenu
 */
class CaptionsButton extends TextTrackButton {
  /**
   * @override
   * @return {CaptionsMenu}
   */
  createMenu() {
    if (this.items) {
      this.items.forEach(item => item.dispose());
      this.items = [];
    }

    const menu = new CaptionsMenu(this.player(), {
      menuButton: this,
    });

    this.hideThreshold_ = 0;

    this.items = this.createItems();
    this.items.forEach(item => menu.addItem(item));

    menu.on('show', () => {
      this.addClass('active');

      this._wasPlaying = !this.player().paused();

      // Handlers to trigger a "click" when menu should exited
      this._playListener = () => this.handleClick();
      this._blurListener = e => {
        // Don't hide the menu if event target is one of our elements
        if (
          this.el().contains(e.target) ||
          menu.el().contains(e.target) ||
          e.target === this.el() ||
          e.target === menu.el()
        ) {
          return;
        }

        this.handleClick();
      };

      if (this._wasPlaying) {
        this.player().pause();
      }

      this.player().one('play', this._playListener);
      this.on(document, 'click', this._blurListener);
    });

    menu.on('hide', () => {
      this.removeClass('active');

      if (this._playListener) {
        this.player().off('play', this._playListener);
      }

      if (this._blurListener) {
        this.off(document, 'click', this._blurListener);
      }

      // Restore video to playing after close, if it was playing when it was opened
      if (this._wasPlaying && this.player().paused()) {
        this.player().play();
      }

      this._wasPlaying = false;
      this._playListener = null;
      this._blurListener = null;
    });

    return menu;
  }

  /**
   * Removes class that adds specific functionality we don't want
   *
   * @param {String} classNames
   * @return {String}
   */
  removePopupClass(classNames) {
    return classNames.replace(/\bvjs-menu-button-popup\b/, ' ');
  }

  /**
   * @override
   * @return {string}
   */
  buildCSSClass() {
    return this.removePopupClass(`vjs-captions-button ${super.buildCSSClass()}`);
  }

  /**
   * @override
   * @return {string}
   */
  buildWrapperCSSClass() {
    return this.removePopupClass(`vjs-captions-button ${super.buildWrapperCSSClass()}`);
  }

  /**
   * @see https://github.com/videojs/video.js/blob/v7.4.1/src/js/control-bar/text-track-controls/text-track-button.js#L40
   * @override
   * @returns {CaptionsMenuItem[]}
   */
  createItems() {
    const player = this.player();
    const tracks = trackUtils.listToArray(player.textTracks());

    if (!tracks.length) {
      return [];
    }

    return tracks.map(track => {
      return new CaptionsMenuItem(this.player(), {
        track,
        selectable: true,
        multiSelectable: false,
        selected: trackUtils.isEnabled(track),
      });
    });
  }
}

CaptionsButton.prototype.kind_ = 'captions';
CaptionsButton.prototype.controlText_ = 'Captions';

export default CaptionsButton;
