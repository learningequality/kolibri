import { ref, watch, provide, inject } from 'vue';
import store from 'kolibri/store';
import { setContentNodeProgress } from '../../composables/useContentNodeProgress';
import useProgressTracking from '../../composables/useProgressTracking';

// Individual injection keys for each provided property/function
const SessionReadyKey = Symbol('SessionReady');
const ProgressKey = Symbol('Progress');
const TimeSpentKey = Symbol('TimeSpent');
const ExtraFieldsKey = Symbol('ExtraFields');
const PastAttemptsKey = Symbol('PastAttempts');
const CompleteKey = Symbol('Complete');
const TotalAttemptsKey = Symbol('TotalAttempts');
const StartTrackingProgressKey = Symbol('StartTrackingProgress');
const StopTrackingProgressKey = Symbol('StopTrackingProgress');
const HandleUpdateProgressKey = Symbol('HandleUpdateProgress');
const HandleAddProgressKey = Symbol('HandleAddProgress');
const HandleUpdateContentStateKey = Symbol('HandleUpdateContentState');
const HandleUpdateInteractionKey = Symbol('HandleUpdateInteraction');
const OnErrorKey = Symbol('OnError');

/**
 * Composable that manages progress tracking for course content.
 * Should be instantiated in CourseUnitView and provides progress state
 * to child components via Vue's provide/inject mechanism.
 *
 * @param {Object} options **Required** Configuration options for the composable.
 * @param {import('vue').Ref<Object>} options.contentNode **Required** Reactive ref to the
 *                                                        current content node.
 * @param {import('vue').Ref<string>} options.courseSessionId **Required** Reactive ref to the
 *                                                            course session ID.
 */
export default function useCourseContentProgress({ contentNode, courseSessionId }) {
  const {
    progress,
    time_spent,
    extra_fields,
    pastattempts,
    complete,
    totalattempts,
    initContentSession,
    updateContentSession,
    startTrackingProgress,
    stopTrackingProgress,
  } = useProgressTracking();

  const sessionReady = ref(false);
  const errored = ref(false);

  /**
   * Update the progress of the content node in the shared progress store
   * in the useContentNodeProgress composable. Do this to have a single
   * source of truth for referencing progress of content nodes.
   */
  const cacheProgress = () => {
    const node = contentNode.value;
    if (node) {
      setContentNodeProgress({
        content_id: node.content_id,
        progress: progress.value,
      });
    }
  };

  /**
   * Wrapped updateContentSession to prevent updates after error
   */
  const wrappedUpdateContentSession = data => {
    if (!errored.value) {
      return updateContentSession(data);
    }
    return Promise.resolve();
  };

  const handleUpdateProgress = progressValue => {
    return wrappedUpdateContentSession({ progress: progressValue });
  };

  const handleAddProgress = progressDelta => {
    return wrappedUpdateContentSession({ progressDelta });
  };

  const handleUpdateContentState = contentState => {
    return wrappedUpdateContentSession({ contentState });
  };

  const handleUpdateInteraction = ({ progress, interaction }) => {
    return wrappedUpdateContentSession({ progress, interaction });
  };

  const onError = error => {
    errored.value = true;
    store.dispatch('handleApiError', { error });
  };

  /**
   * Initialize the content session for progress tracking
   */
  const initSession = async () => {
    const node = contentNode.value;
    if (!node) {
      return;
    }

    sessionReady.value = false;
    errored.value = false;

    try {
      await initContentSession({
        node,
        courseSessionId: courseSessionId.value,
      });
      sessionReady.value = true;
      // Set progress into the content node progress store
      cacheProgress();
    } catch (error) {
      store.dispatch('handleApiError', { error });
    }
  };

  // Watch for progress changes to keep cache up to date
  watch(progress, () => {
    cacheProgress();
  });

  // Watch for content node changes to reinitialize session
  watch(
    () => contentNode.value?.id,
    (newId, oldId) => {
      if (newId && newId !== oldId) {
        initSession();
      }
    },
  );

  initSession();

  provide(SessionReadyKey, sessionReady);
  provide(ProgressKey, progress);
  provide(TimeSpentKey, time_spent);
  provide(ExtraFieldsKey, extra_fields);
  provide(PastAttemptsKey, pastattempts);
  provide(CompleteKey, complete);
  provide(TotalAttemptsKey, totalattempts);
  provide(StartTrackingProgressKey, startTrackingProgress);
  provide(StopTrackingProgressKey, stopTrackingProgress);
  provide(HandleUpdateProgressKey, handleUpdateProgress);
  provide(HandleAddProgressKey, handleAddProgress);
  provide(HandleUpdateContentStateKey, handleUpdateContentState);
  provide(HandleUpdateInteractionKey, handleUpdateInteraction);
  provide(OnErrorKey, onError);
}

/**
 * Injects the course content progress tracking state and handlers
 * provided by `useCourseContentProgress`.
 * Should be called in any child component of CourseUnitView
 * that needs access to progress tracking.
 *
 * @typedef {Object} CourseContentProgressInjectObject
 * @property {import('vue').Ref<boolean>} sessionReady Whether the content session has been
 *                                                     initialized and is ready.
 * @property {import('vue').Ref<number|null>} progress The current progress value (0 to 1).
 * @property {import('vue').Ref<number|null>} time_spent The time spent on the content in seconds.
 * @property {Object} extra_fields Reactive object containing extra fields from the session.
 * @property {import('vue').Ref<Array>} pastattempts An array of past attempts for the content.
 * @property {import('vue').Ref<boolean|null>} complete Whether the content is marked as
 *                                                      complete.
 * @property {import('vue').Ref<number|null>} totalattempts The total number of attempts for the
 *                                                          content.
 * @property {() => void} startTrackingProgress Starts the interval timer for progress tracking.
 * @property {() => Promise<void>} stopTrackingProgress Stops the interval timer and saves
 *                                                      final progress.
 * @property {(progressValue: number) => Promise<void>} handleUpdateProgress Updates progress
 *                                                                           to an absolute value.
 * @property {(progressDelta: number) => Promise<void>} handleAddProgress Adds a delta to the
 *                                                                        current progress.
 * @property {(contentState: Object) => Promise<void>} handleUpdateContentState Updates the
 *                                                                              content state.
 * @property {(interaction: Object) => Promise<void>} handleUpdateInteraction Updates the
 *                                                                          interaction state.
 * @property {(error: Error) => void} onError Handles errors by flagging the session as errored
 *                                            and dispatching to the store.
 *
 * @returns {CourseContentProgressInjectObject} An object with properties and methods for managing
 *                                             the course content progress tracking.
 */
export function injectCourseContentProgress() {
  return {
    sessionReady: inject(SessionReadyKey),
    progress: inject(ProgressKey),
    time_spent: inject(TimeSpentKey),
    extra_fields: inject(ExtraFieldsKey),
    pastattempts: inject(PastAttemptsKey),
    complete: inject(CompleteKey),
    totalattempts: inject(TotalAttemptsKey),
    startTrackingProgress: inject(StartTrackingProgressKey),
    stopTrackingProgress: inject(StopTrackingProgressKey),
    handleUpdateProgress: inject(HandleUpdateProgressKey),
    handleAddProgress: inject(HandleAddProgressKey),
    handleUpdateContentState: inject(HandleUpdateContentStateKey),
    handleUpdateInteraction: inject(HandleUpdateInteractionKey),
    onError: inject(OnErrorKey),
  };
}
