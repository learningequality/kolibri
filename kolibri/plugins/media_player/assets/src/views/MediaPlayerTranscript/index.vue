<template>

  <aside
    :class="['media-player-transcript', {'showing': showing}]"
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
      cues: [],
      activeCueIds: [],
    }),

    computed: {
      mediaDuration() {
        return this.player ? this.player.duration() : 0;
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
