
const KolibriModule = require('kolibri_module');
const VideoComponent = require('./vue/index');
const Vue = require('vue');

class VideoMP4Module extends KolibriModule {
  render(containerElement) {
    const options = {
      el: containerElement,
    };
    Object.assign(options, VideoComponent);
    this.vm = new Vue(options);
  }
}

module.exports = new VideoMP4Module();
