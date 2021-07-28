<template>

  <CoreFullscreen
    ref="html5Renderer"
    class="html5-renderer"
    :style="{ height: contentRendererHeight, width: iframeWidth }"
    @changeFullscreen="isInFullscreen = $event"
  >

    <div
      class="fullscreen-header"
      :style="{ backgroundColor: this.$themePalette.grey.v_100 }"
    >
      <KButton
        :primary="false"
        appearance="flat-button"
        @click="$refs.html5Renderer.toggleFullscreen()"
      >
        <KIcon
          v-if="isInFullscreen"
          icon="fullscreen_exit"
          class="fs-icon"
        />
        <KIcon
          v-else
          icon="fullscreen"
          class="fs-icon"
        />
        {{ fullscreenText }}
      </KButton>
    </div>
    <div class="iframe-container" :style="containerStyle">
      <iframe
        ref="iframe"
        class="iframe"
        sandbox="allow-scripts allow-same-origin"
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
        frameBorder="0"
        :src="rooturl"
      >
      </iframe>
      <KCircularLoader
        v-if="loading"
        :delay="false"
        class="loader"
      />
    </div>
  </CoreFullscreen>

</template>


<script>

  import urls from 'kolibri.urls';
  import { now } from 'kolibri.utils.serverClock';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import Hashi from 'hashi';

  const defaultContentHeight = '500px';
  const frameTopbarHeight = '37px';
  const pxStringAdd = (x, y) => parseInt(x, 10) + parseInt(y, 10) + 'px';
  export default {
    name: 'Html5AppRendererIndex',
    components: {
      CoreFullscreen,
    },
    props: {
      userId: {
        type: String,
        default: '',
      },
      userFullName: {
        type: String,
        default: '',
      },
      progress: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        iframeHeight: (this.options && this.options.height) || defaultContentHeight,
        isInFullscreen: false,
        loading: false,
      };
    },
    computed: {
      rooturl() {
        return urls.hashi();
      },
      iframeWidth() {
        return (this.options && this.options.width) || 'auto';
      },
      contentRendererHeight() {
        return pxStringAdd(this.iframeHeight, frameTopbarHeight);
      },
      fullscreenText() {
        return this.isInFullscreen ? this.$tr('exitFullscreen') : this.$tr('enterFullscreen');
      },
      userData() {
        return {
          userId: this.userId,
          userFullName: this.userFullName,
          progress: this.progress,
          complete: this.progress >= 1,
          language: this.lang.id,
          timeSpent: this.timeSpent,
        };
      },
      containerStyle() {
        if (this.isInFullscreen) {
          return {
            position: 'absolute',
            top: frameTopbarHeight,
            bottom: 0,
          };
        }
        return { height: this.iframeHeight };
      },
      /* eslint-disable kolibri/vue-no-unused-properties */
      /**
       * @public
       * Note: the default duration historically for HTML5 Apps has been 5 min
       */
      defaultDuration() {
        return 300;
      },
      /* eslint-enable kolibri/vue-no-unused-properties */
    },
    watch: {
      userData(newValue) {
        if (newValue && this.hashi) {
          this.hashi.updateData({ userData: newValue });
        }
      },
    },
    mounted() {
      this.hashi = new Hashi({ iframe: this.$refs.iframe, now });
      this.hashi.onStateUpdate(data => {
        this.$emit('updateContentState', data);
      });
      this.hashi.on('navigateTo', message => {
        this.$emit('navigateTo', message);
      });
      this.hashi.on(this.hashi.events.RESIZE, scrollHeight => {
        this.iframeHeight = scrollHeight;
      });
      this.hashi.on(this.hashi.events.LOADING, loading => {
        this.loading = loading;
      });
      this.hashi.on(this.hashi.events.ERROR, err => {
        this.loading = false;
        this.$emit('error', err);
      });
      this.hashi.initialize(
        (this.extraFields && this.extraFields.contentState) || {},
        this.userData,
        this.defaultFile.storage_url,
        this.defaultFile.checksum
      );
      this.$emit('startTracking');
      this.pollProgress();
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.$emit('stopTracking');
    },
    methods: {
      recordProgress() {
        const hashiProgress = this.hashi ? this.hashi.getProgress() : null;
        this.$emit(
          'updateProgress',
          hashiProgress === null ? this.durationBasedProgress : hashiProgress
        );
        this.pollProgress();
      },
      pollProgress() {
        this.timeout = setTimeout(() => {
          this.recordProgress();
        }, 15000);
      },
    },
    $trs: {
      exitFullscreen: {
        message: 'Exit Fullscreen',
        context:
          "Learners can use the Esc key or the 'exit fullscreen' button to close the fullscreen view on an html5 app.",
      },
      enterFullscreen: {
        message: 'View Fullscreen',
        context:
          'Learners can use the full screen button in the upper right corner to open an html5 app in fullscreen view.\n',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  .fullscreen-header {
    text-align: right;
  }
  .fs-icon {
    position: relative;
    top: 8px;
    width: 24px;
    height: 24px;
  }
  .html5-renderer {
    position: relative;
    text-align: center;
  }
  .iframe {
    width: 100%;
    height: 100%;
  }
  .iframe-container {
    @extend %momentum-scroll;

    width: 100%;
    overflow: visible;
  }

  .loader {
    position: absolute;
    top: calc(50% - 16px);
    left: calc(50% - 16px);
  }

</style>
