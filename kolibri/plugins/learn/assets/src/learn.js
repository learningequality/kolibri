
import KolibriModule from 'kolibri_module';
import Vue from 'vue';
import main from './main.vue';


class LearnModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: { main },
    });
  }
}

module.exports = new LearnModule();
