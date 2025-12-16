import videojsVueMixin from './videojsVueMixin';

/**
 * @param {Object} vueComponent A compiled vue component object
 */
export default function videojsMenuItemVueMixin(vueComponent) {
  return class extends videojsVueMixin('MenuItem', vueComponent) {
    createVueComponent(options = {}) {
      const component = super.createVueComponent(options);
      component.$on('hide', () => this.trigger('hide'));
      return component;
    }

    /**
     * Pass responsibility to focus down to Vue component
     */
    focus() {
      this.getVueComponent().focus();
    }

    /**
     * @override
     */
    selected() {
      return this.getVueComponent().selected;
    }

    /**
     * We don't need to handle clicks
     * @override
     */
    handleClick() {}

    /**
     * Remove Video.js tap event handling so it doesn't mess with menu on mobile
     */
    emitTapEvents() {}
  };
}
