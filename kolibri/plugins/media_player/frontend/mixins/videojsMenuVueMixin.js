import videojsVueMixin from './videojsVueMixin';

/**
 * @typedef {import('video.js').default.Component} VideoJsComponent
 */

/**
 * Build a video.js Menu subclass that renders its content through a Vue component.
 * @param {object} vueComponent - A compiled vue component object
 * @returns {typeof VideoJsComponent} The extended Menu class
 */
export default function videojsMenuVueMixin(vueComponent) {
  return class extends videojsVueMixin('Menu', vueComponent) {
    /**
     * Initialise lock and focused-child state on top of the parent Menu constructor.
     * @param {VideoJsComponent} player - The video.js player instance
     * @param {object} [options] - Options forwarded to the parent Menu component
     */
    constructor(player, options) {
      super(player, options);

      this.isLocked = false;
      this.focusedChild_ = 0;
    }

    /**
     * `contentEl` is used when `addItem` is called, so this allows the addition of the text track
     * options (the languages) in the right spot
     * @override
     * @returns {Element} The element into which menu items should be inserted
     */
    contentEl() {
      return this.getVueComponent().contentEl();
    }

    /**
     * `contentEl` is used when `addItem` is called, so this allows the addition of the text track
     * options (the languages) in the right spot
     * @override
     * @returns {Element} The element into which menu items should be inserted
     */
    get contentEl_() {
      return this.contentEl();
    }

    set contentEl_(value) {
      // No op - this gets called by VideoJS but we don't want it to mess with our DOM in this way.
    }

    /**
     * Override parent's method, which adds event handlers we don't want
     * @override
     * @param {VideoJsComponent | string} item - The name or instance of the item to add
     */
    addItem(item) {
      this.addChild(item);
    }

    /**
     * Triggered by mouseenter of button container
     * @override
     */
    show() {
      this.doShow();
    }

    /**
     * Triggered by mouseleave of button container
     * @override
     */
    hide() {
      this.doHide();
    }

    /**
     * Triggered on click in ancestor
     * @override
     */
    lockShowing() {
      this.doShow(true);
    }

    /**
     * Triggered on blur in ancestor
     * @override
     */
    unlockShowing() {
      this.doHide(true);
    }

    /**
     * Show the menu, optionally locking it open so mouseleave won't hide it.
     * @param {boolean} lock - Whether or not to lock it open
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
     * Hide the menu, optionally unlocking it first if it was locked open.
     * @param {boolean} unlock - Whether or not to unlock it if it's locked open
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
     * @param {number} [index] - Child index to focus; defaults to the last focused child, wraps on
     * overflow
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
