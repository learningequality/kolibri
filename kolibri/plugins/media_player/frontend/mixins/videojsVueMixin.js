import Vue from 'vue';
import store from 'kolibri/store';
import videojs from 'video.js';

export default function videojsVueMixin(videojsComponent, vueComponent) {
  const VideojsComponent = videojs.getComponent(videojsComponent);
  const VueComponent = Vue.extend(vueComponent);

  return class extends VideojsComponent {
    createEl() {
      return this.createVueComponent().$el;
    }

    createVueComponent(options) {
      this.clearVueComponent();
      this._vueComponent = new VueComponent(Object.assign({ store }, options)).$mount();
      return this.getVueComponent();
    }

    getVueComponent() {
      return this._vueComponent;
    }

    clearVueComponent() {
      if (this._vueComponent) {
        this._vueComponent.$destroy();
        this._vueComponent = null;
      }
    }

    dispose() {
      this.clearVueComponent();
      super.dispose();
    }
  };
}
