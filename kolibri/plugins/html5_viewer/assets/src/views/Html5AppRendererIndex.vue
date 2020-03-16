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
  import { events, nameSpace } from 'hashi/src/hashiBase';
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
      let self = this;
      this.hashi.on(events.CONTENTLOADED, function(data) {
        // The HTML5 renderer has min and max heights set, so exceedingly low or height height values
        // will not lead to problematic rendering scenarios. Consequently, this also means that it is only
        // giving us the ability to stretch at most a couple hundred pixels height-wise.
        if (data.offsetHeight && data.offsetHeight > 0) {
          self.$refs.html5Renderer.$refs.fullscreen.style.height = data.offsetHeight + 'px';
        }
      });
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
    min-height: 500px;
    max-height: 70vh;
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
