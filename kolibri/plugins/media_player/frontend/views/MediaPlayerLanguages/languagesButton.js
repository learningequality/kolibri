import videojs from 'video.js';
import trackUtils from '../../utils/track';
import buttonMixin from '../../mixins/videojsButtonMixin';
import vueMixin from '../../mixins/videojsVueMixin';
import languagesIcon from './LanguagesIcon.vue';
import LanguagesMenu from './languagesMenu';
import LanguagesMenuItem from './languagesMenuItem';

class LanguageIcon extends vueMixin('Component', languagesIcon) {}

/**
 * The Component for the Button that will open the LanguagesMenu
 */
class LanguagesButton extends buttonMixin('TextTrackButton') {
  /**
   * Construct the button and inject the languages icon into its DOM, sidestepping
   * video.js's built-in icon class so that we can render a Vue component.
   * @param {object} player - The video.js player instance.
   * @param {object} [options] - Component options forwarded to videojs.
   * @param {Function} [ready] - Optional ready callback forwarded to videojs.
   */
  constructor(player, options, ready) {
    super(player, options, ready);

    this.icon = new LanguageIcon(player, {});

    // Hackily add our icon to the button to avoid recreating all the button handling video.js adds
    const iconPlaceholder = this.menuButton_.el().getElementsByClassName('vjs-icon-placeholder')[0];
    videojs.dom.appendContent(iconPlaceholder, this.icon.el());
  }

  /**
   * @override
   * @returns {LanguagesMenu} The languages menu instance attached to this button.
   */
  buildMenu() {
    return new LanguagesMenu(this.player(), {
      menuButton: this,
    });
  }

  /**
   * Only hide menu if it has 0 elements
   * @override
   */
  update() {
    this.hideThreshold_ = 0;
    return super.update();
  }

  /**
   * @override
   * @returns {string} The CSS class for the button element.
   */
  buildCSSClass() {
    return this.removePopupClass(`vjs-languages-button ${super.buildCSSClass()}`);
  }

  /**
   * @override
   * @returns {string} The CSS class for the wrapping element.
   */
  buildWrapperCSSClass() {
    return this.removePopupClass(`vjs-languages-button ${super.buildWrapperCSSClass()}`);
  }

  /**
   * @override
   * @returns {LanguagesMenuItem[]} One menu item per text track on the player.
   * @see https://github.com/videojs/video.js/blob/v7.4.1/src/js/control-bar/text-track-controls/text-track-button.js#L40
   */
  createItems() {
    const player = this.player();
    const tracks = trackUtils.listToArray(player.textTracks());

    if (!tracks.length) {
      return [];
    }

    return tracks.map(track => {
      return new LanguagesMenuItem(this.player(), {
        track,
        selectable: true,
        multiSelectable: false,
        selected: trackUtils.isEnabled(track),
      });
    });
  }
}

LanguagesButton.prototype.controlText_ = 'Languages';

export default LanguagesButton;
