import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue';
import Sandbox from 'kolibri-sandbox';
import urls from 'kolibri/urls';
import { now } from 'kolibri/utils/serverClock';
import useContentViewer from '../useContentViewer';
import { isRenderableFileType } from './renderableFileTypes';

const PROGRESS_POLLING_INTERVAL = 5000;

const DEFAULT_DURATION = 300;

/**
 * Composable for content viewers that render inside the Kolibri sandbox.
 * @param {object} context - The Vue component context object
 * @param {Function} context.emit - The component's emit function for emitting events
 * @param {object} options - Configuration options
 * @param {boolean} [options.pollProgress=false] - Poll the sandbox for progress, falling
 * back to time spent over the content's duration when the content reports none
 * @param {Function|null} [options.urlBuilder=null] - Builds the content URL: called with
 * the file and `{ options, contentNode }`, returns the URL. A new URL for the same file
 * retargets the live handler. The sandbox loads one file for its lifetime: showing a
 * different file needs a remount
 * @param {Function|null} [options.onHandlerRequest=null] - Answers the handler's
 * requestFromHost calls: called with the request and `{ file }`, the file the sandbox
 * loaded, returns the answer or a promise of it. The content shares the handler's origin
 * and can send any request itself: validate it before acting on the Kolibri origin
 * @param {boolean} [options.renderFiles=false] - Render files the handler sends, of
 * the types `isRenderableFileType` accepts, in place of the sandbox, and track files
 * the handler shows over its content itself. A file is sent as `{ data, mimetype, name,
 * hasPrevious }`, `hasPrevious` saying whether the handler has a page to go back to. The
 * content shares the handler's origin and can send any file itself
 * @returns {object} Loading state, the file to render natively, whether the handler shows a
 * file over its content, closeFile to dismiss either, the sandbox page URL, and the
 * initializer
 */
export default function useSandbox(
  { emit },
  { pollProgress = false, urlBuilder = null, onHandlerRequest = null, renderFiles = false } = {},
) {
  const {
    contentNode,
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
  let stopRetargeting = null;
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

  function buildContentUrl() {
    const file = defaultFile.value;
    if (!file) {
      return null;
    }
    return urlBuilder
      ? urlBuilder(file, { options: contentOptions.value, contentNode: contentNode.value })
      : file.storage_url;
  }

  /**
   * Report a failure to load the content. The spinner is ours, so clearing it is too -
   * nothing downstream of the error event unmounts the viewer.
   * @param {string} message - What failed
   */
  function reportLoadingFailure(message) {
    loading.value = false;
    reportLoadingError(message);
  }

  const renderedFile = ref(null);

  function setRenderedFile(file) {
    const previousUrl = renderedFile.value?.url;
    renderedFile.value = file
      ? {
          url: URL.createObjectURL(new Blob([file.data], { type: file.mimetype })),
          mimetype: file.mimetype,
          name: file.name,
          hasPrevious: Boolean(file.hasPrevious),
        }
      : null;
    if (previousUrl) {
      nextTick(() => URL.revokeObjectURL(previousUrl));
    }
  }

  const fileOverlayOpen = ref(false);

  function closeFile() {
    setRenderedFile(null);
    fileOverlayOpen.value = false;
    sandbox?.closeFile();
  }

  function destroySandbox() {
    clearTimeout(progressPollTimeout);
    stopRetargeting?.();
    stopRetargeting = null;
    sandbox?.destroy();
    sandbox = null;
    setRenderedFile(null);
    fileOverlayOpen.value = false;
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
    const startUrl = buildContentUrl();

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

    sandbox.on(sandbox.events.NOW_SHOWING, data => emit('nowShowing', data));

    if (renderFiles) {
      sandbox.on(sandbox.events.RENDER_FILE, file => {
        if (!file || isRenderableFileType(file.mimetype)) {
          setRenderedFile(file);
        }
      });
      sandbox.on(sandbox.events.FILE_OVERLAY, open => {
        fileOverlayOpen.value = Boolean(open);
      });
    }

    if (onHandlerRequest) {
      sandbox.answer(sandbox.events.HANDLER_REQUESTED, request =>
        onHandlerRequest(request, { file }),
      );
    }

    sandbox.initialize(
      extraFields.value?.contentState || {},
      userData.value,
      startUrl,
      file.checksum,
      { handlerUrl: sandboxHandlerUrl.value },
    );

    let shownUrl = startUrl;
    stopRetargeting = watch(
      () => {
        if (defaultFile.value?.checksum !== file.checksum) {
          return null;
        }
        try {
          return buildContentUrl();
        } catch (e) {
          reportLoadingFailure(e.message);
          return null;
        }
      },
      url => {
        if (url && url !== shownUrl) {
          shownUrl = url;
          sandbox.retarget(url);
        }
      },
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
    renderedFile,
    fileOverlayOpen,
    closeFile,
    sandboxUrl: urls.sandbox(),
    initializeSandbox,
  };
}
