
import ContentRendererModule from 'content_renderer_module';
import AudioComponent from './views/index';

class AudioMP3Module extends ContentRendererModule {
  get rendererComponent() {
    return AudioComponent;
  }
}

const audioMP3Module = new AudioMP3Module();

export { audioMP3Module as default };
