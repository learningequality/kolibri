<template>

  <aside
    :class="['media-player-transcript', { showing }]"
    :aria-hidden="(!showing).toString()"
    :aria-label="$tr('label')"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div v-show="!cues.length" class="loading-space fill-space">
      <KCircularLoader
        class="loader"
        :delay="true"
      />
    </div>

    <div
      v-show="cues.length"
      class="transcript-cap"
      :style="capStyle"
    >
      {{ $tr('transcriptBeginning') }}
    </div>
    <template v-for="cue in cues">
      <TranscriptCue
        :key="cue.id"
        :ref="cue.id"
        :cue="cue"
        :langCode="language"
        :active="activeCueIds.indexOf(cue.id) >= 0"
        :mediaDuration="mediaDuration"
        @seek="handleSeekEvent"
      />
    </template>
    <div
      v-show="cues.length"
      class="transcript-cap"
      :style="capStyle"
    >
      {{ $tr('transcriptEnd') }}
    </div>
  </aside>

</template>


<script>

  import { mapState } from 'vuex';
  import { throttle } from 'frame-throttle';

  import TranscriptCue from './TranscriptCue';

  export default {
    name: 'MediaPlayerTranscript',
    components: { TranscriptCue },
    data: () => ({
      langCode: null,
      hovering: false,
      nextScroll: null,
      scrollThrottle: null,
    }),
    computed: {
      ...mapState('mediaPlayer', ['player']),
      ...mapState('mediaPlayer/captions', ['transcript', 'language', 'cues', 'activeCueIds']),
      showing() {
        return this.player && this.transcript;
      },
      mediaDuration() {
        return this.player ? this.player.duration() : 0;
      },
      capStyle() {
        return { color: this.$themeTokens.annotation };
      },
    },
    watch: {
      activeCueIds(newActiveCueIds) {
        if (!newActiveCueIds || !newActiveCueIds.length || !Object.keys(this.$refs).length) {
          return;
        }

        const offsetTop = newActiveCueIds.reduce(
          this.cueReduce((offsetTop, cue) => {
            return Math.min(offsetTop, cue.offsetTop());
          }),
          this.$el.scrollHeight
        );

        const offsetBottom = newActiveCueIds.reduce(
          this.cueReduce((offsetBottom, cue) => {
            return Math.max(offsetBottom, cue.offsetTop() + cue.height());
          }),
          0
        );

        const duration = newActiveCueIds.reduce(
          this.cueReduce((duration, cue) => {
            // Multiply duration by 1000 to get milliseconds
            return duration + cue.duration() * 1000;
          }),
          0
        );

        this.scrollTo(offsetTop, offsetBottom, duration);
      },
      hovering(isHovering) {
        if (!isHovering && this.nextScroll) {
          const { offsetTop, offsetBottom, duration, start } = this.nextScroll;
          const now = new Date().getTime();

          this.scrollTo(offsetTop, offsetBottom, duration - (now - start));
          this.nextScroll = null;
        }
      },
    },
    methods: {
      handleSeekEvent(cueTime) {
        // Add 10ms to cueTime to avoid triggering two cues if they overlap on end and start time
        this.player.currentTime(cueTime + 0.01);
      },
      scrollTo(offsetTop, offsetBottom, duration) {
        const start = new Date().getTime();

        // Clear scroll throttle, if current call is from a scroll throttle this doesn't matter
        if (this.scrollThrottle) {
          this.scrollThrottle.cancel();
          this.scrollThrottle = null;
        }

        if (this.hovering) {
          this.nextScroll = { offsetTop, offsetBottom, duration, start };
          return;
        }

        const height = this.$el.offsetHeight;
        const targetHeight = offsetBottom - offsetTop;
        const offsetMiddle = offsetTop + Math.min(targetHeight, height) / 2;

        const currentScrollTop = this.$el.scrollTop;
        const currentScrollMiddle = currentScrollTop + height / 2;
        const scrollMax = this.$el.scrollHeight - height;

        // Don't trigger a scroll if target scroll position is in top half of container
        if (
          offsetTop > currentScrollTop &&
          offsetTop < currentScrollMiddle &&
          targetHeight <= height
        ) {
          return;
        }

        // Jump backwards to cue
        if (offsetTop < currentScrollTop) {
          this.$el.scrollTo(0, offsetTop);
          return;
        }

        const scrollTo = currentScrollTop + (offsetMiddle - currentScrollMiddle);
        this.$el.scrollTo(0, Math.min(scrollMax, scrollTo));

        if (targetHeight <= height) {
          return;
        }

        // In the event the cue('s) contents is taller than the container, we'll slow scroll for
        // the cue duration until offsetBottom fits
        const step = (offsetBottom - offsetTop - height) / duration;
        this.scrollThrottle = throttle(() => {
          const now = new Date().getTime();
          this.scrollTo(offsetTop + step * (now - start), offsetBottom, duration - (now - start));
        });

        this.$nextTick(this.scrollThrottle);
      },
      /**
       * @param {Function} callback
       * @return {Function}
       */
      cueReduce(callback) {
        return (reduced, cueId) => {
          if (!(cueId in this.$refs) || !this.$refs[cueId]) {
            return reduced;
          }

          const [cue] = this.$refs[cueId];

          try {
            return callback(reduced, cue);
          } catch (e) {
            return reduced;
          }
        };
      },
    },
    $trs: {
      label: 'Transcript',
      transcriptBeginning: 'Beginning of transcript',
      transcriptEnd: 'End of transcript',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .media-player-transcript {
    overflow-x: hidden;
    overflow-y: auto;
    background: #ffffff;
  }

  .transcript-cap {
    padding: 20px;
    font-size: 0.9rem;
    text-align: center;
  }

</style>
