
const ContentRendererModule = require('kolibri.coreModules.contentRenderer');
const HTML5AppComponent = require('./vue/index');

class HTML5AppModule extends ContentRendererModule {
  get rendererComponent() {
    return HTML5AppComponent;
  }
  get contentType() {
    return 'html5/zip';
  }
}

module.exports = new HTML5AppModule();
