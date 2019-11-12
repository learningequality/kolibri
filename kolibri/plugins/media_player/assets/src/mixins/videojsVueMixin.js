import Vue from 'kolibri.lib.vue';
import store from 'kolibri.coreVue.vuex.store';
import videojs from 'video.js';

/**
 * @param {String} videojsComponent A string of the videojs component to extend
 * @param {Object} vueComponent A compiled vue component object
 */
export default function videojsVueMixin(videojsComponent, vueComponent) {
  const VideojsComponent = videojs.getComponent(videojsComponent);
  const VueComponent = Vue.extend(vueComponent);

  return class extends VideojsComponent {
    /**
     * This is called by video.js code that usually constructs an element, but here we'll leverage
     * vue by calling it manually.
     *
     * @return {Element}
     */
    createEl() {
      return this.createVueComponent().$el;
    }

    /**
     * @param {Object} [options]
     * @return {VueComponent}
     */
    createVueComponent(options) {
      this.clearVueComponent();
      this._vueComponent = new VueComponent(Object.assign({ store }, options)).$mount();
      return this.getVueComponent();
    }

    /**
     * @return {VueComponent}
     */
    getVueComponent() {
      return this._vueComponent;
    }

    /**
     * Clears held Vue component instance, destroying it first
     */
    clearVueComponent() {
      if (this._vueComponent) {
        this._vueComponent.$destroy();
        this._vueComponent = null;
      }
    }

    /**
     * video.js hook to dispose this video.js component, so be sure to `clearComponent`
     */
    dispose() {
      this.clearVueComponent();
      super.dispose();
    }
  };
}
