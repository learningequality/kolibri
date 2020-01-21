import videojsVueMixin from './videojsVueMixin';

/**
 * @param {Object} vueComponent A compiled vue component object
 */
export default function videojsMenuVueMixin(vueComponent) {
  return class extends videojsVueMixin('Menu', vueComponent) {
    /**
     * @param player
     * @param options
     */
    constructor(player, options) {
      super(player, options);

      this.isLocked = false;
      this.focusedChild_ = 0;
    }

    /**
     * `contentEl` is used when `addItem` is called, so this allows the addition of the text track
     * options (the languages) in the right spot
     *
     * @override
     * @return {*|Element}
     */
    contentEl() {
      return this.getVueComponent().contentEl();
    }

    /**
     * Override parent's method, which adds event handlers we don't want
     *
     * @override
     * @param {Component|String} item The name or instance of the item to add
     */
    addItem(item) {
      this.addChild(item);
    }

    /**
     * Triggered by mouseenter of button container
     *
     * @override
     */
    show() {
      this.doShow();
    }

    /**
     * Triggered by mouseleave of button container
     *
     * @override
     */
    hide() {
      this.doHide();
    }

    /**
     * Triggered on click in ancestor
     *
     * @override
     */
    lockShowing() {
      this.doShow(true);
    }

    /**
     * Triggered on blur in ancestor
     *
     * @override
     */
    unlockShowing() {
      this.doHide(true);
    }

    /**
     * @param {Boolean} lock Whether or not to lock it open
     */
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

    /**
     * @param {Boolean} unlock Whether or not to unlock it if it's locked open
     */
    doHide(unlock = false) {
      const component = this.getVueComponent();

      if (!component || !component.showing() || (!unlock && this.isLocked)) {
        return;
      }

      this.trigger('unlock');
      this.isLocked = false;
      component.hide(unlock);
    }

    /**
     * Called by Video.js key event handlers
     */
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
