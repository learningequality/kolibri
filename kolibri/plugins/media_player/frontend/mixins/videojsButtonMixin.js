import videojs from 'video.js';

/**
 * Build a base class extending the named video.js menu button component, with
 * additional behaviour for hiding the menu on mouseleave and dismissing it on
 * outside clicks.
 * @param {string} videojsComponent - The name of the videojs component to extend.
 * @returns {Function} A class extending the requested videojs component.
 */
export default function videojsButtonMixin(videojsComponent) {
  return class extends videojs.getComponent(videojsComponent) {
    /**
     * Wire up the mouseleave-to-hide behaviour and the outside-click listener used
     * to dismiss the menu.
     * @param {object} player - The video.js player instance.
     * @param {object} [options] - Component options forwarded to videojs.
     * @param {Function} [ready] - Optional ready callback forwarded to videojs.
     */
    constructor(player, options, ready) {
      super(player, options, ready);

      // Add missing hide handler since we're not using video.js hover CSS to show it
      this.on(this.menuButton_.el().parentElement, 'mouseleave', () => {
        this.menu.hide();
      });

      this.documentClickListener = e => {
        if (this.el().contains(e.target)) {
          return;
        }

        // This will cascade to triggering `unlock` event
        this.unpressButton();
      };
    }

    /**
     * Should build and return an instance of a Video.js Menu. The base
     * implementation throws; subclasses must override.
     * @throws {Error} Always — subclasses must override this method.
     */
    buildMenu() {
      throw new Error('Not implemented');
    }

    /**
     * @override
     * @returns {object} A configured video.js Menu, populated with items and wired up to
     * the outside-click listener.
     */
    createMenu() {
      if (this.items) {
        this.items.forEach(item => item.dispose());
        this.items = [];
      }

      const menu = this.buildMenu();
      this.items = this.createItems();
      this.items.forEach(item => {
        menu.addItem(item);
        item.on('hide', () => this.unpressButton());
      });

      menu.on('lock', () => {
        document.addEventListener('click', this.documentClickListener);
      });

      menu.on('unlock', () => {
        document.removeEventListener('click', this.documentClickListener);
      });

      return menu;
    }

    /**
     * Removes the `vjs-menu-button-popup` class that adds specific functionality
     * we don't want.
     * @param {string} classNames - Space-separated class string to filter.
     * @returns {string} The class string without the popup class.
     */
    removePopupClass(classNames) {
      return classNames.replace(/\bvjs-menu-button-popup\b/, ' ');
    }
  };
}
