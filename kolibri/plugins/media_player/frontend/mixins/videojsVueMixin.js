import Vue from 'vue';
import store from 'kolibri/store';
import videojs from 'video.js';

/**
 * Produce a video.js component class that renders a Vue component as its DOM element.
 * @param {string} videojsComponent - A string of the videojs component to extend
 * @param {object} vueComponent - A compiled vue component object
 * @returns {Function} Subclass of the named video.js component backed by the Vue component
 */
export default function videojsVueMixin(videojsComponent, vueComponent) {
  const VideojsComponent = videojs.getComponent(videojsComponent);
  const VueComponent = Vue.extend(vueComponent);

  return class extends VideojsComponent {
    /**
     * This is called by video.js code that usually constructs an element, but here we'll leverage
     * vue by calling it manually.
     * @returns {Element} Root DOM element from the mounted Vue component
     */
    createEl() {
      return this.createVueComponent().$el;
    }

    /**
     * Destroy any existing Vue instance and mount a fresh one, storing it on the component.
     * @param {object} [options] - Extra options forwarded to the Vue component constructor
     * @returns {VueComponent} The freshly mounted Vue component
     */
    createVueComponent(options) {
      this.clearVueComponent();
      this._vueComponent = new VueComponent(Object.assign({ store }, options)).$mount();
      return this.getVueComponent();
    }

    /**
     * Return the currently mounted Vue component, if any.
     * @returns {VueComponent} The currently held Vue component, or undefined if none is mounted
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
