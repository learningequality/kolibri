import mixin from '../../mixins/videojsMenuVueMixin';
import captionsMenu from './CaptionsMenu.vue';

class CaptionsMenu extends mixin(captionsMenu) {
  /**
   * Reset focus child to first item.
   * @param {boolean} [lock] - When true, lock the menu open.
   */
  doShow(lock = false) {
    this.focusedChild_ = 0;
    super.doShow(lock);
  }
}

export default CaptionsMenu;
