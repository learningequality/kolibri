<template>

  <CoreFullscreen
    ref="html5Renderer"
    class="html5-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <KButton
      :primary="false"
      class="fullscreen-btn"
      @click="$refs.html5Renderer.toggleFullscreen()"
    >
      <!--
        FIXME: Restore these once I find the right way to vertially center the SVG icon
        <mat-svg v-if="isInFullscreen" name="fullscreen_exit" category="navigation" />
        <mat-svg v-else name="fullscreen" category="navigation" />
      -->
      {{ fullscreenText }}
    </KButton>
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
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import Hashi from 'hashi';
  import { nameSpace } from 'hashi/src/hashiBase';
  import plugin_data from 'plugin_data';

  export default {
    name: 'Html5AppRendererIndex',
    components: {
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
      fullscreenText() {
        return this.isInFullscreen ? this.$tr('exitFullscreen') : this.$tr('enterFullscreen');
      },
    },
    mounted() {
      this.hashi = new Hashi({ iframe: this.$refs.iframe, now });
      this.hashi.onStateUpdate(data => {
        this.$emit('updateContentState', data);
      });
      this.hashi.initialize((this.extraFields && this.extraFields.contentState) || {});
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
        this.$emit('updateProgress', Math.max(0, totalTime / 300000));
        this.pollProgress();
      },
      pollProgress() {
        this.timeout = setTimeout(() => {
          this.recordProgress();
        }, 15000);
      },
    },
    $trs: {
      exitFullscreen: 'Exit Fullscreen',
      enterFullscreen: 'View Fullscreen',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .fullscreen-btn {
    width: 100%;
    margin: 0;
    text-align: right;
    box-shadow: none;
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

    top: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

</style>
