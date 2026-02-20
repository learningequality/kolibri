import mixin from '../../mixins/videojsMenuVueMixin';
import languagesMenu from './LanguagesMenu.vue';

class LanguagesMenu extends mixin(languagesMenu) {
  /**
   * Set focus child to the currently selected child when about to show the menu
   * @param {Boolean} lock
   */
  doShow(lock = false) {
    this.focusedChild_ = this.children().findIndex(child => child.selected());
    super.doShow(lock);
  }
}

export default LanguagesMenu;
