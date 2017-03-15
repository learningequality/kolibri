
const ContentRendererModule = require('content_renderer_module');
const VideoComponent = require('./vue/index');

class VideoMP4Module extends ContentRendererModule {
  get rendererComponent() {
    return VideoComponent;
  }
}

module.exports = new VideoMP4Module();
