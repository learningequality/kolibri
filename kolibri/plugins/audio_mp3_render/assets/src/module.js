
const KolibriModule = require('kolibri_module');
const AudioComponent = require('./vue/index');
const Vue = require('vue');

class AudioMP3Module extends KolibriModule {
  render(containerElement) {
    const options = {
      el: containerElement,
    };
    Object.assign(options, AudioComponent);
    this.vm = new Vue(options);
  }
}

module.exports = new AudioMP3Module();
