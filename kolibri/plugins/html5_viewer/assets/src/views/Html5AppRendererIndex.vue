<template>

  <CoreFullscreen
    ref="html5Renderer"
    class="html5-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <UiIconButton
      class="btn"
      :style="{ fill: $themeTokens.textInverted }"
      :ariaLabel="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      color="primary"
      size="large"
      @click="$refs.html5Renderer.toggleFullscreen()"
    >
      <mat-svg v-if="isInFullscreen" name="fullscreen_exit" category="navigation" />
      <mat-svg v-else name="fullscreen" category="navigation" />
    </UiIconButton>
    <div class="iframe-container">
      <iframe
        ref="iframe"
        class="iframe"
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
        :sandbox="sandbox"
        frameBorder="0"
        :name="name"
        :src="rooturl"
      >
      </iframe>
    </div>
  </CoreFullscreen>

</template>


<script>

  import { now } from 'kolibri.utils.serverClock';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import Hashi from 'hashi';
  import { nameSpace } from 'hashi/src/hashiBase';
  import plugin_data from 'plugin_data';

  export default {
    name: 'Html5AppRendererIndex',
    components: {
      UiIconButton,
      CoreFullscreen,
    },
    data() {
      return {
        isInFullscreen: false,
      };
    },
    computed: {
      name() {
        return nameSpace;
      },
      rooturl() {
        return this.defaultFile.storage_url;
      },
      sandbox() {
        return plugin_data.html5_sandbox_tokens;
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
      this.hashi.initialize(
        (this.extraFields && this.extraFields.contentState) || {},
        this.userData
      );
      this.$emit('startTracking');
      this.startTime = now();
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
        const totalTime = now() - this.startTime;
        const hashiProgress = this.hashi ? this.hashi.getProgress() : null;
        this.$emit(
          'updateProgress',
          hashiProgress === null ? Math.max(0, totalTime / 3000000) : hashiProgress
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
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .btn {
    position: absolute;
    top: 8px;
    right: 21px;
    z-index: 1;
  }

  .html5-renderer {
    position: relative;
    height: 500px;
    text-align: center;
  }

  .iframe {
    width: 100%;
    height: 100%;
  }

  .iframe-container {
    @extend %momentum-scroll;

    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

</style>
