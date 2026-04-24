import mixin from '../../mixins/videojsMenuVueMixin';
import captionsMenu from './CaptionsMenu.vue';

class CaptionsMenu extends mixin(captionsMenu) {
  doShow(lock = false) {
    this.focusedChild_ = 0;
    super.doShow(lock);
  }
}

export default CaptionsMenu;
