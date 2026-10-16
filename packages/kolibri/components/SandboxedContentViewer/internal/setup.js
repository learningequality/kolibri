import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';
import router from 'kolibri/router';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import useSandbox from '../../../composables/internal/useSandbox';
import useContentViewer from '../../../composables/useContentViewer';
import { createFileElement, isImage } from './fileElement';

const FRAME_TOPBAR_HEIGHT = '48px';

export const sandboxedContentViewerStrings = createTranslator('SandboxedContentViewer', {
  contentFrameTitle: {
    message: 'Content viewer',
    context: 'Accessible title for the iframe that displays the content',
  },
});

const { contentFrameTitle$ } = sandboxedContentViewerStrings;

export default function sandboxedContentViewerSetup(props, context, options) {
  const {
    loading,
    renderedFile,
    closeRenderedFile,
    fileOverlayOpen,
    closeFileOverlay,
    sandboxUrl,
    initializeSandbox,
  } = useSandbox(context, options);
  const { progress, timeSpent, extraFields, userId, userFullName } = useContentViewer(context);

  const renderedImage = computed(
    () => Boolean(renderedFile.value) && isImage(renderedFile.value.mimetype),
  );
  const renderedElement = computed(() =>
    renderedFile.value
      ? createFileElement(renderedFile.value.mimetype, renderedFile.value.url)
      : null,
  );

  const fullscreenRef = ref(null);
  const iframeElement = ref(null);
  const backButton = ref(null);
  const isFullscreen = ref(false);

  const hasShownContent = ref(false);
  watch(
    () => !loading.value && !renderedFile.value,
    showingContent => {
      if (showingContent) {
        hasShownContent.value = true;
      }
    },
  );
  const canGoBackFromRenderedFile = computed(() => renderedImage.value || hasShownContent.value);

  watch(
    () => Boolean(renderedFile.value) || fileOverlayOpen.value,
    async shown => {
      await nextTick();
      if (shown) {
        backButton.value?.$el.focus();
      } else {
        iframeElement.value.focus();
      }
    },
  );

  const hostRoutesPages = Boolean(context.listeners?.nowShowing);

  function goBackFromRenderedFile() {
    if (renderedImage.value) {
      closeRenderedFile();
    } else if (!hostRoutesPages) {
      closeRenderedFile();
      closeFileOverlay();
    } else {
      router.back();
    }
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

  onMounted(() => {
    // The sandbox handles the iframe load timing internally via READYCHECK/IFRAMEREADY
    initializeSandbox(iframeElement.value);
  });

  return {
    fullscreenRef,
    iframeElement,
    backButton,
    isFullscreen,
    loading,
    renderedFile,
    goBackFromRenderedFile,
    canGoBackFromRenderedFile,
    fileOverlayOpen,
    closeFileOverlay,
    goBackLabel: coreStrings.goBackAction$(),
    renderedImage,
    renderedElement,
    progress,
    timeSpent,
    extraFields,
    userId,
    userFullName,
    sandboxUrl,
    contentFrameTitle: contentFrameTitle$(),
    containerStyle,
    toggleFullscreen,
  };
}
