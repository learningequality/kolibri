import ContentRendererModule from 'kolibri-viewer';
import ExerciseComponent from './views/PerseusRendererIndex';

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    ExerciseComponent.contentModule = this;
    return ExerciseComponent;
  }
}

const exercisePerseusModule = new ExercisePerseusModule();

export default exercisePerseusModule;
