import mixin from '../../mixins/videojsMenuVueMixin';
import languagesMenu from './LanguagesMenu.vue';

class LanguagesMenu extends mixin(languagesMenu) {
  doShow(lock = false) {
    this.focusedChild_ = this.children().findIndex(child => child.selected());
    super.doShow(lock);
  }
}

export default LanguagesMenu;
