import ContentViewerModule from 'kolibri-viewer';
import ExerciseComponent from './views/PerseusRendererIndex';

class ExercisePerseusModule extends ContentViewerModule {
  get viewerComponent() {
    ExerciseComponent.contentModule = this;
    return ExerciseComponent;
  }
}

const exercisePerseusModule = new ExercisePerseusModule();

export default exercisePerseusModule;
