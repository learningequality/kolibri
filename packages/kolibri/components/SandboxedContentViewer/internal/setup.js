import { ref, computed, onMounted } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';
import useSandbox from '../../../composables/internal/useSandbox';

const FRAME_TOPBAR_HEIGHT = '48px';

const { contentFrameTitle$ } = createTranslator('SandboxedContentViewer', {
  contentFrameTitle: {
    message: 'Content viewer',
    context: 'Accessible title for the iframe that displays the content',
  },
});

export default function sandboxedContentViewerSetup(props, context, options = {}) {
  const {
    defaultDuration = null,
    progressPollingInterval = null,
    urlBuilder = null,
    eventHandlers = {},
  } = options;

  const viewer = useSandbox(context, {
    defaultDuration,
    progressPollingInterval,
    urlBuilder,
    eventHandlers,
  });

  const fullscreenRef = ref(null);
  const iframeElement = ref(null);
  const isFullscreen = ref(false);

  const containerStyle = computed(() => {
    if (isFullscreen.value) {
      return {
        position: 'absolute',
        top: FRAME_TOPBAR_HEIGHT,
        bottom: 0,
      };
    }
    return {};
  });

  function toggleFullscreen() {
    fullscreenRef.value?.toggleFullscreen();
  }

  onMounted(() => {
    viewer.iframeRef.value = iframeElement.value;

    if (viewer.isSandboxed.value) {
      // Initialize sandbox immediately (like the old code did)
      // The sandbox handles the iframe load timing internally via READYCHECK/IFRAMEREADY
      viewer.initializeSandbox();
      context.emit('startTracking');
    } else {
      viewer.reportLoadingFailure(
        `No sandbox handler registered for preset ${viewer.defaultItemPreset.value}`,
      );
    }
  });

  return {
    fullscreenRef,
    iframeElement,
    isFullscreen,
    // Exposed so a host can bind its own handlers to the client once it exists.
    sandbox: viewer.sandbox,
    loading: viewer.loading,
    sandboxUrl: viewer.sandboxUrl,
    contentFrameTitle: contentFrameTitle$(),
    containerStyle,
    toggleFullscreen,
    getProgress: viewer.getProgress,
  };
}
