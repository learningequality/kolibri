import ContentRendererModule from 'content_renderer_module'; // eslint-disable-line import/extensions
import ExerciseComponent from './views/PerseusRendererIndex';

// Add window.btoa polyfill
global.btoa = global.btoa ? global.btoa : require('btoa');

// Load qtip2 for Perseus tooltips
require('qtip2');

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    ExerciseComponent.contentModule = this;
    return ExerciseComponent;
  }
}

const exercisePerseusModule = new ExercisePerseusModule();

export default exercisePerseusModule;
