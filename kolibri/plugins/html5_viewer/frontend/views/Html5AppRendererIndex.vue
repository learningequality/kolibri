<template>

  <CoreFullscreen
    ref="html5Viewer"
    class="html5-viewer"
    :style="{ width: iframeWidth }"
    @changeFullscreen="isInFullscreen = $event"
  >
    <ViewerToolbar
      :isInFullscreen="isInFullscreen"
      :embedded="embedded"
      @toggleFullscreen="$refs.html5Viewer.toggleFullscreen()"
    />
    <div
      class="iframe-container"
      :style="containerStyle"
    >
      <iframe
        ref="iframe"
        class="iframe"
        sandbox="allow-scripts allow-same-origin"
        :style="{ backgroundColor: $themePalette.grey.v_200 }"
        frameBorder="0"
        :src="rooturl"
        allow="fullscreen"
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

  import urls from 'kolibri/urls';
  import { now } from 'kolibri/utils/serverClock';
  import CoreFullscreen from 'kolibri-common/components/CoreFullscreen';

  import ViewerToolbar from 'kolibri-common/components/ViewerToolbar';
  import Sandbox from 'kolibri-sandbox';

  import useContentViewer from 'kolibri/composables/useContentViewer';

  const defaultContentHeight = '500px';
  const frameTopbarHeight = '48px';
  export default {
    name: 'Html5AppRendererIndex',
    components: {
      CoreFullscreen,

      ViewerToolbar,
    },
    setup(props, context) {
      const {
        options,
        lang,
        forceDurationBasedProgress,
        durationBasedProgress,
        defaultFile,
        reportError,
        extraFields,
        timeSpent,
        userId,
        userFullName,
        progress,
        embedded,
      } = useContentViewer(context, { defaultDuration: 300 });
      return {
        options,
        lang,
        forceDurationBasedProgress,
        durationBasedProgress,
        defaultFile,
        reportError,
        extraFields,
        timeSpent,
        userId,
        userFullName,
        progress,
        embedded,
      };
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
        return urls.sandbox();
      },
      iframeWidth() {
        return (this.options && this.options.width) || 'auto';
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
        if (this.embedded) {
          return {
            height: '100%',
          };
        }
        return {};
      },
      entry() {
        return (this.options && this.options.entry) || 'index.html';
      },
      isH5P() {
        return this.defaultFile.extension === 'h5p';
      },
    },
    watch: {
      userData(newValue) {
        if (newValue && this.sandbox) {
          this.sandbox.updateData({ userData: newValue });
        }
      },
    },
    mounted() {
      this.sandbox = new Sandbox({ iframe: this.$refs.iframe, now });
      this.sandbox.onStateUpdate(data => {
        this.$emit('updateContentState', data);
        const progress = this.sandbox.getProgress();
        if (progress !== null && !this.forceDurationBasedProgress) {
          this.$emit('updateProgress', progress);
          if (progress >= 1) {
            this.$emit('finished');
          }
        }
      });
      this.sandbox.on('navigateTo', message => {
        this.$emit('navigateTo', message);
      });
      this.sandbox.on(this.sandbox.events.RESIZE, scrollHeight => {
        this.iframeHeight = scrollHeight;
      });
      this.sandbox.on(this.sandbox.events.LOADING, loading => {
        this.loading = loading;
      });
      this.sandbox.on(this.sandbox.events.ERROR, err => {
        this.loading = false;
        this.reportError(err);
      });
      const storageUrl = this.isH5P
        ? this.defaultFile.storage_url
        : urls.zipContentUrl(this.defaultFile, this.entry);

      this.sandbox.initialize(
        (this.extraFields && this.extraFields.contentState) || {},
        this.userData,
        storageUrl,
        this.defaultFile.checksum,
      );
      this.$emit('startTracking');
      if (!this.isH5P) {
        this.pollProgress();
      }
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.$emit('stopTracking');
    },
    methods: {
      recordProgress() {
        let progress;
        if (this.forceDurationBasedProgress) {
          progress = this.durationBasedProgress;
        } else {
          const sandboxProgress = this.sandbox ? this.sandbox.getProgress() : null;
          progress = sandboxProgress === null ? this.durationBasedProgress : sandboxProgress;
        }
        this.$emit('updateProgress', progress);
        if (progress >= 1) {
          this.$emit('finished');
        }
        this.pollProgress();
      },
      pollProgress() {
        this.timeout = setTimeout(() => {
          this.recordProgress();
        }, 5000);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  $frame-topbar-height: 48px;

  .html5-viewer {
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
    height: calc(100% - #{$frame-topbar-height});
    margin-bottom: -8px;
    overflow: hidden;
  }

  .loader {
    position: absolute;
    top: calc(50% - 16px);
    left: calc(50% - 16px);
  }

</style>
