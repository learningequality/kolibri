
const ContentRendererModule = require('content_renderer_module');
const VideoComponent = require('./vue/index');

class VideoMP4Module extends ContentRendererModule {
  get rendererComponent() {
    return VideoComponent;
  }
  get contentType() {
    return require('./content_types.json');
  }
}

module.exports = new VideoMP4Module();
