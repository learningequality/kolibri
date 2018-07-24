import HTML5AppComponent from './views/Html5AppRendererIndex';
import ContentRendererModule from 'content_renderer_module';

class HTML5AppModule extends ContentRendererModule {
  get rendererComponent() {
    return HTML5AppComponent;
  }
}

const hTML5AppModule = new HTML5AppModule();

export { hTML5AppModule as default };
