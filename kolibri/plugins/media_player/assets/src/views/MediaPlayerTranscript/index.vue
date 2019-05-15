<template>

  <aside
    :class="['media-player-transcript', { showing }]"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div v-show="!cues.length" class="loading-space fill-space">
      <KCircularLoader
        class="loader"
        :delay="true"
      />
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
  </aside>

</template>


<script>

  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';

  import Settings from '../settings';
  import TrackHandler from './trackHandler';
  import TranscriptCue from './TranscriptCue';

  export default {
    name: 'MediaPlayerTranscript',

    components: { TranscriptCue, KCircularLoader },

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
      cues: [],
      activeCueIds: [],
    }),

    computed: {
      mediaDuration() {
        return this.player ? this.player.duration() : 0;
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

        this.scrollTo(offsetTop, offsetBottom);
      },

      hovering(isHovering) {
        if (!isHovering && this.nextScroll) {
          this.scrollTo(...this.nextScroll);
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

      scrollTo(offsetTop, offsetBottom) {
        if (this.hovering) {
          this.nextScroll = [offsetTop, offsetBottom];
          return;
        }

        const height = this.$el.offsetHeight;
        const offsetMiddle = offsetTop + Math.min(offsetBottom - offsetTop, height) / 2;

        const currentScrollTop = this.$el.scrollTop;
        const currentScrollMiddle = currentScrollTop + height / 2;
        const scrollMax = this.$el.scrollHeight - height;

        if (offsetTop > currentScrollTop && offsetTop < currentScrollMiddle) {
          return;
        }

        if (offsetTop < currentScrollTop) {
          this.$el.scrollTo(0, offsetTop);
          return;
        }

        const scrollTo = currentScrollTop + (offsetMiddle - currentScrollMiddle);
        this.$el.scrollTo(0, Math.min(scrollMax, scrollTo));
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .media-player-transcript {
    overflow-x: hidden;
    overflow-y: auto;
    background: #ffffff;
  }

</style>
