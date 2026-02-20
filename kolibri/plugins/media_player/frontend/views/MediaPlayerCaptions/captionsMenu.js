import mixin from '../../mixins/videojsMenuVueMixin';
import captionsMenu from './CaptionsMenu.vue';

class CaptionsMenu extends mixin(captionsMenu) {
  /**
   * Reset focus child to first item
   * @param {Boolean} lock
   */
  doShow(lock = false) {
    this.focusedChild_ = 0;
    super.doShow(lock);
  }
}

export default CaptionsMenu;
