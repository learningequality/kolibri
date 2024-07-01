import ContentRendererModule from 'content_renderer_module';
import ExerciseComponent from './views/PerseusRendererIndex';

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    ExerciseComponent.contentModule = this;
    return ExerciseComponent;
  }
}

const exercisePerseusModule = new ExercisePerseusModule();

export default exercisePerseusModule;
