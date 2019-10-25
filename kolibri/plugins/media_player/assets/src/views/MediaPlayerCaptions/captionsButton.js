import buttonMixin from '../../mixins/videojsButtonMixin';
import CaptionsMenu from './captionsMenu';

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
   * Items handled in Vue component
   * @return {Array}
   */
  createItems() {
    const length = super.createItems().length;

    // Set hide threshold so the button and menu are hidden when not needed
    this.hideThreshold_ = length > 1 ? -1 : 0;
    return [];
  }
}

CaptionsButton.prototype.kind_ = 'captions';
CaptionsButton.prototype.controlText_ = 'Captions';

export default CaptionsButton;
