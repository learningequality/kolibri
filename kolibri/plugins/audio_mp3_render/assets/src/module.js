
const ContentRendererModule = require('content_renderer_module');
const AudioComponent = require('./views/index');

class AudioMP3Module extends ContentRendererModule {
  get rendererComponent() {
    return AudioComponent;
  }
}

module.exports = new AudioMP3Module();
