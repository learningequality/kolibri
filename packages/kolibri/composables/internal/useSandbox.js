import { ref, computed, watch, onBeforeUnmount } from 'vue';
import Sandbox from 'kolibri-sandbox';
import urls from 'kolibri/urls';
import { now } from 'kolibri/utils/serverClock';
import useContentViewer from '../useContentViewer';

const PROGRESS_POLLING_INTERVAL = 5000;

const DEFAULT_DURATION = 300;

/**
 * Composable for content viewers that render inside the Kolibri sandbox.
 * @param {object} context - The Vue component context object
 * @param {Function} context.emit - The component's emit function for emitting events
 * @param {object} options - Configuration options
 * @param {boolean} [options.pollProgress=false] - Poll the sandbox for progress, falling
 * back to time spent over the content's duration when the content reports none
 * @param {Function|null} [options.urlBuilder=null] - Custom function to build content URL
 * @returns {object} Loading state, the sandbox page URL, and the initializer
 */
export default function useSandbox({ emit }, { pollProgress = false, urlBuilder = null } = {}) {
  const {
    options: contentOptions,
    lang,
    defaultFile,
    defaultItemPreset,
    forceDurationBasedProgress,
    durationBasedProgress,
    reportError,
    reportLoadingError,
    userId,
    userFullName,
    timeSpent,
    progress,
    extraFields,
  } = useContentViewer({ emit }, { defaultDuration: pollProgress ? DEFAULT_DURATION : null });

  const loading = ref(true);
  let sandbox = null;
  let tracking = false;
  let progressPollTimeout = null;

  const sandboxHandlerUrl = computed(() => {
    const preset = defaultItemPreset.value;
    if (!preset) {
      return null;
    }
    // Lazy require to avoid circular dependency and test initialization issues
    const coreApp = require('kolibri').default;
    return coreApp.getSandboxHandlerUrl(preset);
  });

  /**
   * Report a failure to load the content. The spinner is ours, so clearing it is too -
   * nothing downstream of the error event unmounts the viewer.
   * @param {string} message - What failed
   */
  function reportLoadingFailure(message) {
    loading.value = false;
    reportLoadingError(message);
  }

  function destroySandbox() {
    clearTimeout(progressPollTimeout);
    sandbox?.destroy();
    sandbox = null;
  }

  const userData = computed(() => ({
    userId: userId.value,
    userFullName: userFullName.value,
    progress: progress.value,
    complete: progress.value >= 1,
    language: lang.value?.id,
    timeSpent: timeSpent.value,
  }));

  /**
   * Emit progress update, handling duration-based fallback.
   * @param {number|null} sandboxProgress - Progress reported by the sandbox, or null when unknown
   */
  function emitProgress(sandboxProgress) {
    let currentProgress;
    if (forceDurationBasedProgress.value) {
      currentProgress = durationBasedProgress.value;
    } else {
      currentProgress = sandboxProgress !== null ? sandboxProgress : durationBasedProgress.value;
    }

    if (currentProgress !== null) {
      emit('updateProgress', currentProgress);
      if (currentProgress >= 1) {
        emit('finished');
      }
    }
  }

  function schedulePoll() {
    progressPollTimeout = setTimeout(() => {
      emitProgress(sandbox.getProgress());
      schedulePoll();
    }, PROGRESS_POLLING_INTERVAL);
  }

  function createSandbox(iframe) {
    if (!sandboxHandlerUrl.value) {
      throw new Error(`No sandbox handler registered for preset ${defaultItemPreset.value}`);
    }
    const file = defaultFile.value;
    if (!file) {
      throw new Error('No renderable file found');
    }

    sandbox = new Sandbox({ iframe, now });

    sandbox.onStateUpdate(data => {
      emit('updateContentState', data);
      const currentProgress = sandbox.getProgress();
      if (currentProgress !== null && !forceDurationBasedProgress.value) {
        emitProgress(currentProgress);
      }
    });

    sandbox.on(sandbox.events.LOADING, isLoading => {
      loading.value = isLoading;
    });

    sandbox.on(sandbox.events.ERROR, err => {
      loading.value = false;
      reportError(err);
    });

    sandbox.on(sandbox.events.NAVIGATETO, message => emit('navigateTo', message));

    sandbox.initialize(
      extraFields.value?.contentState || {},
      userData.value,
      urlBuilder ? urlBuilder(file, { options: contentOptions.value }) : file.storage_url,
      file.checksum,
      { handlerUrl: sandboxHandlerUrl.value },
    );

    if (pollProgress) {
      schedulePoll();
    }
  }

  /**
   * Load the content into the mounted sandbox iframe and start tracking.
   * @param {HTMLIFrameElement} iframe - The sandbox iframe, already in the document
   */
  function initializeSandbox(iframe) {
    try {
      createSandbox(iframe);
    } catch (e) {
      reportLoadingFailure(e.message);
      return;
    }
    tracking = true;
    emit('startTracking');
  }

  watch(userData, () => sandbox?.updateData({ userData: userData.value }));

  onBeforeUnmount(() => {
    if (tracking) {
      emit('stopTracking');
    }
    destroySandbox();
  });

  return {
    loading,
    sandboxUrl: urls.sandbox(),
    initializeSandbox,
  };
}
