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
        useScormScoreAsProgress: true,
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
        if (data.SCORM && data.SCORM.version) {
          if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
          }
          if (data.SCORM.cmi && data.SCORM.cmi.core) {
            const core = data.SCORM.cmi.core;
            if (this.useScormScoreAsProgress) {
              let score = core.score;
              if (score) {
                // If min and max are not set, raw will be a value in the range 0-100. Source:
                // https://support.scorm.com/hc/en-us/articles/206166466-cmi-score-raw-whole-numbers-
                let rawPercent = 1;
                let rawScore = score.raw;

                // TODO: Needs testing with ranges outside 0-100, all content so far specifying
                // min and max have these values, so behavior is the same as if they were not set.
                if (score.min && score.max) {
                  // rawPercent = percent per range increment
                  // preMin = highest value before min, what to subtract from the range
                  // rawScore = value from 1 to (max - preMin), assumes min and max are
                  // positive numbers
                  // this way we can calculate progress percent as value * incrementPercent
                  const preMin = Math.min(0, score.min - 1);
                  rawPercent = (score.max - preMin) / 100;
                  rawScore = rawScore - preMin;
                }

                // Convert the raw value to a percentage increment.
                let percent = (rawScore * rawPercent) / 100;
                this.$emit('updateProgress', Math.min(1, Math.max(0, percent)));
              }
            }
          }
        }
      });
      this.hashi.initialize((this.extraFields && this.extraFields.contentState) || {}, {
        userId: this.userId,
        userFullName: this.userFullName,
        progress: this.progress,
        complete: this.progress >= 1,
        language: this.lang.id,
        timeSpent: this.timeSpent,
      });
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
