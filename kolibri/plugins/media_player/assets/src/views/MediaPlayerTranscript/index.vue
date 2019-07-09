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
        :langCode="langCode"
        :active="activeCueIds.indexOf(cue.id) >= 0"
        :mediaDuration="mediaDuration"
        @seek="handleSeekEvent"
      />
    </template>
    <div
      class="transcript-cap"
      :style="capStyle"
    >
      {{ $tr('transcriptEnd') }}
    </div>
  </aside>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import { throttle } from 'frame-throttle';

  import Settings from '../../utils/settings';
  import TrackHandler from './trackHandler';
  import TranscriptCue from './TranscriptCue';

  export default {
    name: 'MediaPlayerTranscript',

    components: { TranscriptCue, KCircularLoader },

    mixins: [themeMixin],

    props: {
      defaultLangCode: {
        type: String,
        required: true,
      },
    },

    data: () => ({
      langCode: null,
      showing: false,
      hovering: false,
      nextScroll: null,
      scrollThrottle: null,
      cues: [],
      activeCueIds: [],
    }),

    computed: {
      mediaDuration() {
        return this.player ? this.player.duration() : 0;
      },

      capStyle() {
        return { color: this.$themeTokens.annotation };
      },
    },

    watch: {
      activeCueIds(newActiveCueIds) {
        if (!newActiveCueIds || !newActiveCueIds.length) {
          return;
        }

        const offsetTop = newActiveCueIds.reduce((offsetTop, cueId) => {
          const [cue] = this.$refs[cueId];
          return Math.min(offsetTop, cue.offsetTop());
        }, this.$el.scrollHeight);

        const offsetBottom = newActiveCueIds.reduce((offsetBottom, cueId) => {
          const [cue] = this.$refs[cueId];
          return Math.max(offsetBottom, cue.offsetTop() + cue.height());
        }, 0);

        const duration = newActiveCueIds.reduce((duration, cueId) => {
          const [cue] = this.$refs[cueId];

          // Multiply duration by 1000 to get milliseconds
          return duration + cue.duration() * 1000;
        }, 0);

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

    created() {
      this.settings = new Settings({
        transcriptLangCode: this.defaultLangCode,
        transcriptShowing: false,
      });
    },

    methods: {
      /**
       * @public
       */
      setPlayer(player) {
        /** @var {TranscriptButton} */
        const button = player.getChild('ControlBar').getChild('TranscriptButton');

        if (!button) {
          return;
        }

        this.player = player;
        this.button = button;

        this.button.on('toggleTranscript', () => this.toggle());
        this.button.on('trackChange', () => this.loadTrack(this.button.getActiveTrack()));

        this.player.on('texttrackchange', () => this.handleTrackChange());
        this.player.one('loadstart', () => this.loadTracks(this.button.getTracks()));
      },

      toggle(showing = !this.showing) {
        if (showing === this.showing) {
          return;
        }

        this.showing = showing;
        this.settings.transcriptShowing = this.showing;
        this.$emit('toggleTranscript', this.showing);
      },

      handleSeekEvent(cueTime) {
        this.player.currentTime(cueTime);
      },

      handleTrackChange() {
        // Protect against video.js disabling our track on a trackchange event
        if (this.handler && this.showing) {
          this.handler.activate();
        }
      },

      loadTracks(textTracks) {
        this.tracks = textTracks.map(track => {
          // Hack :: override addCue since there is no event for when cues are added or ready
          const addCue = track.addCue.bind(track);
          track.addCue = function(cue) {
            this.trigger('addcue', cue);
            return addCue(cue);
          };

          return track;
        });

        const track = this.tracks.find(t => t.language === this.settings.transcriptLangCode);
        if (track) {
          this.button.selectTrack(track);
          this.loadTrack(track, false);
          this.toggle(this.settings.transcriptShowing);
        }
      },

      loadTrack(track, doToggle = true) {
        if (this.handler) {
          this.handler.deactivate();
          this.handler = null;
        }

        if (!track) {
          if (doToggle) {
            this.toggle(false);
          }
          return;
        }

        this.langCode = track.language;

        this.handler = new TrackHandler(track);
        this.cues = this.handler.getCues();
        this.activeCueIds = this.handler.getActiveCueIds();
        this.handler.on('addcue', () => {
          this.cues = this.handler.getCues();
        });
        this.handler.on('cuechange', () => {
          this.activeCueIds = this.handler.getActiveCueIds();
        });

        if (doToggle) {
          this.toggle(true);
        }
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
