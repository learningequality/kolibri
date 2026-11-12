<template>

  <Fullscreen
    ref="fullscreenRef"
    class="sandboxed-content-viewer"
    @changeFullscreen="isFullscreen = $event"
  >
    <ViewerToolbar
      :isInFullscreen="isFullscreen"
      :showFullscreenToggle="!renderedWithOwnFullscreen"
      @toggleFullscreen="toggleFullscreen"
    >
      <template #left>
        <KIconButton
          v-if="canGoBack"
          ref="backButton"
          icon="back"
          :ariaLabel="goBackLabel"
          :tooltip="goBackLabel"
          @click="goBack"
        />
      </template>
    </ViewerToolbar>

    <div
      v-if="renderedFile"
      ref="renderedFileElement"
      class="rendered-file"
      tabindex="-1"
      :style="containerStyle"
    >
      <KCircularLoader
        v-if="hostLoading"
        :delay="false"
        class="loader"
      />
      <img
        v-else-if="renderedImage"
        class="rendered-file-content rendered-image"
        :src="renderedFile.url"
        :alt="renderedFile.name || renderedImageLabel"
      >
      <ContentViewerError
        v-else-if="renderedFileError"
        class="rendered-file-content"
        :error="renderedFileError"
      />
      <ContentViewer
        v-else
        :key="renderedFile.url"
        class="rendered-file-content"
        :element="renderedElement"
        v-bind="renderedPageSession"
        v-on="renderedPageListeners"
        @error="showRenderedFileError"
      />
    </div>

    <div
      v-show="!renderedFile"
      class="iframe-container"
      :style="containerStyle"
    >
      <iframe
        ref="iframeElement"
        class="iframe"
        sandbox="allow-scripts allow-same-origin"
        :style="{ backgroundColor: 'var(--palette-grey-v200)' }"
        frameBorder="0"
        :src="sandboxUrl"
        :title="contentFrameTitle"
        allow="fullscreen"
      >
      </iframe>

      <KCircularLoader
        v-if="loading"
        :delay="false"
        class="loader"
      />
    </div>
  </Fullscreen>

</template>


<script>

  import Fullscreen from 'kolibri/components/Fullscreen';
  import ViewerToolbar from 'kolibri/components/ViewerToolbar';
  import ContentViewer from '../../internal/ContentViewer';
  import ContentViewerError from '../../internal/ContentViewer/ContentViewerError';
  import setup from './setup';

  export default {
    name: 'SandboxedContentViewer',

    components: {
      ContentViewer,
      ContentViewerError,
      Fullscreen,
      ViewerToolbar,
    },

    setup(props, context) {
      return setup(props, context);
    },

    emits: [
      'startTracking',
      'stopTracking',
      'updateProgress',
      'updateContentState',
      'error',
      'navigateTo',
      'nowShowing',
      'goBack',
      'finished',
    ],
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  $frame-topbar-height: 48px;

  .sandboxed-content-viewer {
    position: relative;
    text-align: center;
  }

  .iframe-container {
    @extend %momentum-scroll;

    width: 100%;
    height: calc(100% - #{$frame-topbar-height});
    margin-bottom: -8px;
    overflow: hidden;
  }

  .iframe,
  .rendered-file-content {
    width: 100%;
    height: 100%;
  }

  .rendered-file {
    width: 100%;
    height: calc(100% - #{$frame-topbar-height});
  }

  .rendered-image {
    object-fit: contain;
  }

  .loader {
    position: absolute;
    top: calc(50% - 16px);
    left: calc(50% - 16px);
  }

</style>
