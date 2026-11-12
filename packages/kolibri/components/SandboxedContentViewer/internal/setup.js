import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import useSandbox from '../../../composables/internal/useSandbox';
import { createFileElement, hasOwnFullscreen, isImage } from './fileElement';

const FRAME_TOPBAR_HEIGHT = '48px';

export const sandboxedContentViewerStrings = createTranslator('SandboxedContentViewer', {
  contentFrameTitle: {
    message: 'Content viewer',
    context: 'Accessible title for the iframe that displays the content',
  },
  renderedImageLabel: {
    message: 'Image',
    context:
      'Alternative text for an image the content opens in place of itself, when the image has no name',
  },
});

const { contentFrameTitle$, renderedImageLabel$ } = sandboxedContentViewerStrings;

export default function sandboxedContentViewerSetup(props, context, options) {
  const {
    loading,
    hostLoading,
    renderedFile,
    renderedPageSession,
    renderedPageListeners,
    fileOverlayOpen,
    closeFile,
    sandboxUrl,
    initializeSandbox,
  } = useSandbox(context, options);

  const renderedImage = computed(
    () => Boolean(renderedFile.value) && isImage(renderedFile.value.mimetype),
  );
  const renderedInViewer = computed(() => Boolean(renderedFile.value) && !renderedImage.value);
  const renderedWithOwnFullscreen = computed(
    () => Boolean(renderedFile.value) && hasOwnFullscreen(renderedFile.value.mimetype),
  );
  const renderedElement = computed(() =>
    renderedFile.value
      ? createFileElement(renderedFile.value.mimetype, renderedFile.value.url)
      : null,
  );

  const fullscreenRef = ref(null);
  const iframeElement = ref(null);
  const backButton = ref(null);
  const renderedFileElement = ref(null);
  const isFullscreen = ref(false);

  const canGoBack = computed(() =>
    renderedFile.value ? renderedFile.value.hasPrevious : fileOverlayOpen.value,
  );

  function focusIsOurs() {
    const focused = document.activeElement;
    return !focused || focused === document.body || fullscreenRef.value?.$el.contains(focused);
  }

  watch(
    () => [renderedFile.value?.url, fileOverlayOpen.value],
    async ([url, overlayOpen]) => {
      if (!focusIsOurs()) {
        return;
      }
      await nextTick();
      if (url || overlayOpen) {
        (backButton.value?.$el ?? renderedFileElement.value)?.focus();
      } else {
        iframeElement.value?.focus();
      }
    },
  );

  function goBack() {
    if (renderedInViewer.value && context.listeners?.goBack) {
      context.emit('goBack');
    } else {
      closeFile();
    }
  }

  const renderedFileError = ref(null);
  watch(renderedFile, () => {
    renderedFileError.value = null;
  });

  function showRenderedFileError(error) {
    const message = error && typeof error === 'object' ? error.message : error;
    renderedFileError.value = { message: message == null ? '' : String(message) };
  }

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

  watch(renderedWithOwnFullscreen, ownFullscreen => {
    if (ownFullscreen && isFullscreen.value) {
      toggleFullscreen();
    }
  });

  onMounted(() => {
    // The sandbox handles the iframe load timing internally via READYCHECK/IFRAMEREADY
    initializeSandbox(iframeElement.value);
  });

  return {
    fullscreenRef,
    iframeElement,
    backButton,
    renderedFileElement,
    isFullscreen,
    loading,
    hostLoading,
    renderedFile,
    goBack,
    canGoBack,
    goBackLabel: coreStrings.goBackAction$(),
    renderedImage,
    renderedWithOwnFullscreen,
    renderedElement,
    renderedFileError,
    showRenderedFileError,
    renderedPageSession,
    renderedPageListeners,
    sandboxUrl,
    contentFrameTitle: contentFrameTitle$(),
    renderedImageLabel: renderedImageLabel$(),
    containerStyle,
    toggleFullscreen,
  };
}
