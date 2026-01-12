import { ref, computed, onMounted } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';
import useSandbox from '../../../composables/internal/useSandbox';

const FRAME_TOPBAR_HEIGHT = '48px';

export const sandboxedContentViewerStrings = createTranslator('SandboxedContentViewer', {
  contentFrameTitle: {
    message: 'Content viewer',
    context: 'Accessible title for the iframe that displays the content',
  },
});

const { contentFrameTitle$ } = sandboxedContentViewerStrings;

export default function sandboxedContentViewerSetup(props, context, options) {
  const { loading, sandboxUrl, initializeSandbox } = useSandbox(context, options);

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
    // The sandbox handles the iframe load timing internally via READYCHECK/IFRAMEREADY
    initializeSandbox(iframeElement.value);
  });

  return {
    fullscreenRef,
    iframeElement,
    isFullscreen,
    loading,
    sandboxUrl,
    contentFrameTitle: contentFrameTitle$(),
    containerStyle,
    toggleFullscreen,
  };
}
