import videojsVueMixin from './videojsVueMixin';

export default function videojsMenuVueMixin(vueComponent) {
  return class extends videojsVueMixin('Menu', vueComponent) {
    constructor(player, options) {
      super(player, options);

      this.isLocked = false;
      this.focusedChild_ = 0;
    }

    contentEl() {
      return this.getVueComponent().contentEl();
    }

    get contentEl_() {
      return this.contentEl();
    }

    set contentEl_(value) {
      // No op - this gets called by VideoJS but we don't want it to mess with our DOM in this way.
    }

    addItem(item) {
      this.addChild(item);
    }

    /**
     * Triggered by mouseenter of button container.
     * @override
     */
    show() {
      this.doShow();
    }

    /**
     * Triggered by mouseleave of button container.
     * @override
     */
    hide() {
      this.doHide();
    }

    lockShowing() {
      this.doShow(true);
    }

    /**
     * Triggered on blur in ancestor.
     * @override
     */
    unlockShowing() {
      this.doHide(true);
    }

    doShow(lock = false) {
      const component = this.getVueComponent();

      if (lock && !this.isLocked) {
        this.trigger('lock');
      }

      this.isLocked = this.isLocked || lock;

      if (!component || component.showing()) {
        return;
      }

      component.show();
    }

    doHide(unlock = false) {
      const component = this.getVueComponent();

      if (!component || !component.showing() || (!unlock && this.isLocked)) {
        return;
      }

      this.trigger('unlock');
      this.isLocked = false;
      component.hide(unlock);
    }

    focus(index) {
      const children = this.children();

      if (!children) {
        return;
      }

      if (!index && index !== 0) {
        index = this.focusedChild_;
      } else if (index >= children.length) {
        index = 0;
      } else if (index < 0) {
        index = children.length - 1;
      }

      this.focusedChild_ = index;
      children[index].focus();
    }
  };
}
