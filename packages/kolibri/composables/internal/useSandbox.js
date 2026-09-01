import { ref, shallowRef, computed, watch, onBeforeUnmount } from 'vue';
import logger from 'kolibri-logging';
import Sandbox from 'kolibri-sandbox';
import urls from 'kolibri/urls';
import { now } from 'kolibri/utils/serverClock';
import useContentViewer from '../useContentViewer';

const logging = logger.getLogger(__filename);

/**
 * Composable for content viewers that render inside the Kolibri sandbox.
 *
 * Wraps useContentViewer, taking all content and session state from it, and layers
 * sandbox lifecycle management on top. Returns the full useContentViewer API plus the
 * sandbox-specific state and methods, so a sandboxed viewer component only needs to call
 * this composable.
 * @param {object} context - The Vue component context object
 * @param {Function} context.emit - The component's emit function for emitting events
 * @param {object} options - Configuration options
 * @param {number|null} [options.defaultDuration=null] - Default duration for progress
 * @param {number|null} [options.progressPollingInterval=null] - Interval in ms to poll progress
 * @param {Function|null} [options.urlBuilder=null] - Custom function to build content URL
 * @param {object} [options.eventHandlers={}] - Additional sandbox event handlers
 * @returns {object} The useContentViewer API plus sandbox state and methods
 */
export default function useSandbox({ emit }, options = {}) {
  const {
    defaultDuration = null,
    progressPollingInterval = null,
    urlBuilder = null,
    eventHandlers = {},
  } = options;

  const viewer = useContentViewer({ emit }, { defaultDuration });

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
  } = viewer;

  const iframeRef = ref(null);
  // Returned so a consumer can bind its own handlers to the client. shallowRef because
  // the client holds a mediator and the iframe element - deep reactivity would walk both.
  const sandbox = shallowRef(null);
  const loading = ref(true);
  let progressPollTimeout = null;

  const sandboxUrl = computed(() => urls.sandbox());

  const sandboxHandlerUrl = computed(() => {
    const preset = defaultItemPreset.value;
    if (!preset) {
      return null;
    }
    // Lazy require to avoid circular dependency and test initialization issues
    const coreApp = require('kolibri').default;
    return coreApp.getSandboxHandlerUrl(preset);
  });

  const isSandboxed = computed(() => {
    return sandboxHandlerUrl.value !== null;
  });

  const contentUrl = computed(() => {
    const file = defaultFile.value;
    if (!file) {
      return null;
    }
    if (urlBuilder) {
      return urlBuilder(file, { options: contentOptions.value });
    }
    return file.storage_url;
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

  /**
   * Poll progress at configured interval.
   */
  function pollProgress() {
    if (!progressPollingInterval || !sandbox.value) {
      return;
    }

    const currentProgress = sandbox.value.getProgress();
    emitProgress(currentProgress);

    progressPollTimeout = setTimeout(pollProgress, progressPollingInterval);
  }

  /**
   * Create the sandbox instance, bind its events, and load the content into the iframe.
   */
  async function initializeSandbox() {
    if (!isSandboxed.value) {
      logging.warn('initializeSandbox called but content is not sandboxed');
      return;
    }

    if (!iframeRef.value) {
      throw new Error('iframeRef must be set before initializing sandbox');
    }

    const file = defaultFile.value;
    if (!file) {
      reportLoadingFailure('No renderable file found');
      return;
    }

    // Create sandbox instance
    const client = new Sandbox({
      iframe: iframeRef.value,
      now,
    });
    sandbox.value = client;

    // Bind standard sandbox events
    client.onStateUpdate(data => {
      emit('updateContentState', data);
      const currentProgress = client.getProgress();
      if (currentProgress !== null && !forceDurationBasedProgress.value) {
        emitProgress(currentProgress);
      }
    });

    client.on(client.events.LOADING, isLoading => {
      loading.value = isLoading;
    });

    client.on(client.events.ERROR, err => {
      loading.value = false;
      reportError(err);
    });

    // Bind additional custom event handlers
    for (const [eventName, handler] of Object.entries(eventHandlers)) {
      client.on(eventName, data => handler(data, emit));
    }

    // Build user data object
    const userData = {
      userId: userId.value,
      userFullName: userFullName.value,
      progress: progress.value,
      complete: progress.value >= 1,
      language: lang.value?.id,
      timeSpent: timeSpent.value,
    };

    // Initialize sandbox with content
    client.initialize(
      extraFields.value?.contentState || {},
      userData,
      contentUrl.value,
      file.checksum,
      { handlerUrl: sandboxHandlerUrl.value },
    );

    // Start progress polling if configured
    if (progressPollingInterval) {
      pollProgress();
    }
  }

  function getProgress() {
    return sandbox.value?.getProgress() ?? null;
  }

  function updateUserData() {
    if (!sandbox.value) return;

    sandbox.value.updateData({
      userData: {
        userId: userId.value,
        userFullName: userFullName.value,
        progress: progress.value,
        complete: progress.value >= 1,
        language: lang.value?.id,
        timeSpent: timeSpent.value,
      },
    });
  }

  // Watch for user data changes
  watch(
    () => ({
      userId: userId.value,
      userFullName: userFullName.value,
      progress: progress.value,
      timeSpent: timeSpent.value,
    }),
    () => {
      if (isSandboxed.value) {
        updateUserData();
      }
    },
  );

  // Cleanup on unmount
  onBeforeUnmount(() => {
    if (progressPollTimeout) {
      clearTimeout(progressPollTimeout);
    }
    // Only emit stopTracking for sandboxed content - non-sandboxed viewers handle their own
    if (isSandboxed.value) {
      emit('stopTracking');
    }
    sandbox.value?.destroy();
    sandbox.value = null;
  });

  return {
    ...viewer,

    // Sandbox state and methods
    sandbox,
    iframeRef,
    loading,
    sandboxUrl,
    sandboxHandlerUrl,
    isSandboxed,
    contentUrl,
    reportLoadingFailure,
    initializeSandbox,
    getProgress,
    updateUserData,
  };
}
