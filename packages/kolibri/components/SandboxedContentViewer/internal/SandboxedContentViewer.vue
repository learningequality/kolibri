<template>

  <Fullscreen
    ref="fullscreenRef"
    class="sandboxed-content-viewer"
    @changeFullscreen="isFullscreen = $event"
  >
    <div
      v-if="renderedFile"
      class="rendered-file"
    >
      <div class="rendered-file-bar">
        <KIconButton
          v-if="canGoBackFromRenderedFile"
          ref="backButton"
          icon="back"
          :ariaLabel="goBackLabel"
          :tooltip="goBackLabel"
          @click="goBackFromRenderedFile"
        />
      </div>
      <img
        v-if="renderedImage"
        class="rendered-file-content rendered-image"
        :src="renderedFile.url"
        :alt="renderedFile.name"
      >
      <ContentViewer
        v-else
        class="rendered-file-content"
        :element="renderedElement"
        :progress="progress"
        :timeSpent="timeSpent"
        :extraFields="extraFields"
        :userId="userId"
        :userFullName="userFullName"
        @updateProgress="value => $emit('updateProgress', value)"
        @addProgress="value => $emit('addProgress', value)"
        @updateContentState="value => $emit('updateContentState', value)"
        @finished="() => $emit('finished')"
        @error="value => $emit('error', value)"
      />
    </div>

    <div
      v-if="!renderedFile && fileOverlayOpen"
      class="rendered-file-bar"
    >
      <KIconButton
        ref="backButton"
        icon="back"
        :ariaLabel="goBackLabel"
        :tooltip="goBackLabel"
        @click="closeFileOverlay"
      />
    </div>
    <ViewerToolbar
      v-show="!renderedFile && !fileOverlayOpen"
      :isInFullscreen="isFullscreen"
      @toggleFullscreen="toggleFullscreen"
    />

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
  import setup from './setup';

  export default {
    name: 'SandboxedContentViewer',

    components: {
      ContentViewer,
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
      'addProgress',
      'updateContentState',
      'error',
      'navigateTo',
      'nowShowing',
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
  .rendered-file {
    width: 100%;
    height: 100%;
  }

  .rendered-file-bar {
    display: flex;
    align-items: center;
    height: $frame-topbar-height;
    padding-left: 8px;
  }

  .rendered-file-content {
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
