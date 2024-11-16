import ContentRendererModule from 'kolibri-viewer';
import HTML5AppComponent from './views/Html5AppRendererIndex';

class HTML5AppModule extends ContentRendererModule {
  get rendererComponent() {
    return HTML5AppComponent;
  }
}

const hTML5AppModule = new HTML5AppModule();

export { hTML5AppModule as default };
