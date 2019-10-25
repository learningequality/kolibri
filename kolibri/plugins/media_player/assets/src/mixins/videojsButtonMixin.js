import videojs from 'video.js';

/**
 * @param {String} videojsComponent A string of the videojs component to extend
 */
export default function videojsButtonMixin(videojsComponent) {
  return class extends videojs.getComponent(videojsComponent) {
    /**
     * Should build and return an instance of a Video.js Menu
     * @return {Menu}
     */
    buildMenu() {
      throw new Error('Not implemented');
    }

    /**
     * @override
     * @return {Menu}
     */
    createMenu() {
      if (this.items) {
        this.items.forEach(item => item.dispose());
        this.items = [];
      }

      const menu = this.buildMenu();

      this.items = this.createItems();
      this.items.forEach(item => menu.addItem(item));

      menu.on('show', () => {
        this.addClass('active');

        this._wasPlaying = !this.player().paused();

        // Handlers to trigger a "click" when menu should exited
        this._playListener = () => this.handleClick();
        this._blurListener = e => {
          // Don't hide the menu if event target is one of our elements
          if (
            this.el().contains(e.target) ||
            menu.el().contains(e.target) ||
            e.target === this.el() ||
            e.target === menu.el()
          ) {
            return;
          }

          this.handleClick();
        };

        if (this._wasPlaying) {
          this.player().pause();
        }

        this.player().one('play', this._playListener);
        this.on(document, 'click', this._blurListener);
      });

      menu.on('hide', () => {
        this.removeClass('active');

        if (this._playListener) {
          this.player().off('play', this._playListener);
        }

        if (this._blurListener) {
          this.off(document, 'click', this._blurListener);
        }

        // Restore video to playing after close, if it was playing when it was opened
        if (this._wasPlaying && this.player().paused()) {
          this.player().play();
        }

        this._wasPlaying = false;
        this._playListener = null;
        this._blurListener = null;
      });

      return menu;
    }

    /**
     * Removes class that adds specific functionality we don't want
     *
     * @param {String} classNames
     * @return {String}
     */
    removePopupClass(classNames) {
      return classNames.replace(/\bvjs-menu-button-popup\b/, ' ');
    }
  };
}
