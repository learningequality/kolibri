import videojs from 'video.js';

export default function videojsButtonMixin(videojsComponent) {
  return class extends videojs.getComponent(videojsComponent) {
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

    buildMenu() {
      throw new Error('Not implemented');
    }

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

    removePopupClass(classNames) {
      return classNames.replace(/\bvjs-menu-button-popup\b/, ' ');
    }
  };
}
