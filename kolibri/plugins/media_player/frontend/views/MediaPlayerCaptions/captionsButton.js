import buttonMixin from '../../mixins/videojsButtonMixin';
import CaptionsMenu from './captionsMenu';
import SubtitlesMenuItem from './subtitlesMenuItem';
import TranscriptMenuItem from './transcriptMenuItem';

/**
 * The Component for the Button that will open the CaptionsMenu
 */
class CaptionsButton extends buttonMixin('TextTrackButton') {
  buildMenu() {
    return new CaptionsMenu(this.player(), {
      menuButton: this,
    });
  }

  /**
   * @override
   * @returns {string} The CSS class for the button element.
   */
  buildCSSClass() {
    return this.removePopupClass(`vjs-captions-button ${super.buildCSSClass()}`);
  }

  /**
   * @override
   * @returns {string} The CSS class for the wrapping element.
   */
  buildWrapperCSSClass() {
    return this.removePopupClass(`vjs-captions-button ${super.buildWrapperCSSClass()}`);
  }

  /**
   * @override
   * @returns {Array<TranscriptMenuItem|SubtitlesMenuItem>} The menu items to display,
   * or an empty list when fewer than two text tracks are available.
   */
  createItems() {
    // Use logic from parent to determine if we should fill menu
    const length = super.createItems().length;

    if (length <= 1) {
      this.hideThreshold_ = 0;
      return [];
    }

    this.hideThreshold_ = -1;
    const player = this.player();
    return [new SubtitlesMenuItem(player, {}), new TranscriptMenuItem(player, {})];
  }
}

CaptionsButton.prototype.kind_ = 'captions';
CaptionsButton.prototype.controlText_ = 'Captions';

export default CaptionsButton;
