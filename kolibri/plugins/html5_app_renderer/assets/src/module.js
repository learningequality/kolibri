
const ContentRendererModule = require('content_renderer_module');
const HTML5AppComponent = require('./vue/index');

class HTML5AppModule extends ContentRendererModule {
  get rendererComponent() {
    return HTML5AppComponent;
  }
}

module.exports = new HTML5AppModule();
