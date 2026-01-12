<template>

  <Fullscreen
    ref="fullscreenRef"
    class="sandboxed-content-viewer"
    @changeFullscreen="isFullscreen = $event"
  >
    <ViewerToolbar
      :isInFullscreen="isFullscreen"
      @toggleFullscreen="toggleFullscreen"
    />

    <div
      class="iframe-container"
      :style="containerStyle"
    >
      <iframe
        ref="iframeElement"
        class="iframe"
        sandbox="allow-scripts allow-same-origin"
        :style="{ backgroundColor: $themePalette.grey.v_200 }"
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
  import setup from './setup';

  export default {
    name: 'SandboxedContentViewer',

    components: {
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

  .iframe {
    width: 100%;
    height: 100%;
  }

  .loader {
    position: absolute;
    top: calc(50% - 16px);
    left: calc(50% - 16px);
  }

</style>
