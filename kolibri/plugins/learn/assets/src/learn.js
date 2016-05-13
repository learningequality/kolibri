
import KolibriModule from 'kolibri_module';
import Vue from 'vue';
import main from './learn-main';


const LearnModule = KolibriModule.extend({
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: { main },
    });
  },
});

module.exports = new LearnModule();
