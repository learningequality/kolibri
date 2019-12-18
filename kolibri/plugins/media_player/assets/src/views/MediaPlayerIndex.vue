<template>

  <MediaPlayerFullscreen
    ref="fullscreen"
    class="fill-space"
    :style="{
      'border-color': $themeTokens.fineLine,
    }"
    @changeFullscreen="isFullscreen = $event"
  >
    <div
      ref="wrapper"
      :class="[
        'wrapper',
        {
          'keyboard-modality': $inputModality === 'keyboard',
          'video-loading': loading,
          'transcript-visible': transcriptVisible,
          'transcript-wrap': windowIsPortrait || (!isFullscreen && windowIsSmall),
        },
        $computedClass(progressStyle)
      ]"
    >
      <div v-show="loading" class="loading-space fill-space">
        <KCircularLoader
          class="loader"
          :delay="true"
        />
      </div>

      <video
        v-if="isVideo"
        ref="player"
        class="video-js custom-skin vjs-big-play-centered vjs-show-big-play-button-on-pause"
      >
        <template v-for="video in videoSources">
          <source
            :key="video.storage_url"
            :src="video.storage_url"
            :type="`video/${video.extension}`"
          >
        </template>
        <template v-for="track in trackSources">
          <track
            :key="track.storage_url"
            kind="captions"
            :src="track.storage_url"
            :srclang="track.lang.id"
            :label="track.lang.lang_name"
            :default="isDefaultTrack(track.lang.id)"
          >
        </template>
      </video>

      <audio v-else ref="player" class="video-js custom-skin">
        <template v-for="audio in audioSources">
          <source
            :key="audio.storage_url"
            :src="audio.storage_url"
            :type="`audio/${audio.extension}`"
          >
        </template>
      </audio>

      <MediaPlayerTranscript v-if="transcriptVisible" ref="transcript" />
    </div>
  </MediaPlayerFullscreen>

</template>


<script>

  import vue from 'kolibri.lib.vue';
  import { mapActions, mapState, mapGetters } from 'vuex';
  import videojs from 'video.js';
  import throttle from 'lodash/throttle';

  import { languageIdToCode } from 'kolibri.utils.i18n';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  import Settings from '../utils/settings';
  import { ReplayButton, ForwardButton } from './customButtons';
  import MediaPlayerFullscreen from './MediaPlayerFullscreen';
  import MimicFullscreenToggle from './MediaPlayerFullscreen/mimicFullscreenToggle';
  import MediaPlayerTranscript from './MediaPlayerTranscript';
  import CaptionsButton from './MediaPlayerCaptions/captionsButton';
  import LanguagesButton from './MediaPlayerLanguages/languagesButton';

  import audioIconPoster from './audio-icon-poster.svg';

  const GlobalLangCode = vue.locale;

  const componentsToRegister = {
    MimicFullscreenToggle,
    ReplayButton,
    ForwardButton,
    CaptionsButton,
    LanguagesButton,
  };

  Object.entries(componentsToRegister).forEach(([name, component]) =>
    videojs.registerComponent(name, component)
  );

  export default {
    name: 'MediaPlayerIndex',
    components: { MediaPlayerFullscreen, MediaPlayerTranscript },
    mixins: [commonCoreStrings, responsiveWindowMixin, responsiveElementMixin],
    data: () => ({
      dummyTime: 0,
      progressStartingPoint: 0,
      lastUpdateTime: 0,
      loading: true,
      playerVolume: 1.0,
      playerMuted: false,
      playerRate: 1.0,
      defaultLangCode: GlobalLangCode,
      updateContentStateInterval: null,
      isFullscreen: false,
    }),
    computed: {
      ...mapState('mediaPlayer/captions', {
        transcript: state => state.transcript,
        captionLanguage: state => state.language,
      }),
      ...mapGetters('mediaPlayer/captions', {
        captionTracks: 'tracks',
      }),
      posterSources() {
        const posterFileExtensions = ['png', 'jpg'];
        return this.thumbnailFiles.filter(file =>
          posterFileExtensions.some(ext => ext === file.extension)
        );
      },
      audioPoster() {
        if (this.posterSources.length) {
          return this.posterSources[0].storage_url;
        }
        return audioIconPoster;
      },
      videoSources() {
        const videoFileExtensions = ['mp4', 'webm', 'ogg'];
        return this.files.filter(file => videoFileExtensions.some(ext => ext === file.extension));
      },
      audioSources() {
        const audioFileExtensions = ['mp3'];
        return this.files.filter(file => audioFileExtensions.some(ext => ext === file.extension));
      },
      trackSources() {
        const trackFileExtensions = ['vtt'];
        return this.supplementaryFiles.filter(file =>
          trackFileExtensions.some(ext => ext === file.extension)
        );
      },
      isVideo() {
        return this.videoSources.length;
      },
      savedLocation() {
        if (this.extraFields && this.extraFields.contentState) {
          return this.extraFields.contentState.savedLocation;
        }
        return 0;
      },
      progressStyle() {
        return {
          '.vjs-play-progress': {
            backgroundColor: this.$themeTokens.primary,
            '::before': {
              color: this.$themeTokens.primary,
            },
          },
        };
      },
      transcriptVisible() {
        return this.transcript && !this.loading && this.captionTracks.length > 0;
      },
    },
    watch: {
      isFullscreen() {
        this.resizePlayer();
      },
    },
    created() {
      this.settings = new Settings({
        playerVolume: this.playerVolume,
        playerMuted: this.playerMuted,
        playerRate: this.playerRate,
      });
    },
    mounted() {
      this.initPlayer();
      window.addEventListener('resize', this.throttledResizePlayer);
    },
    beforeDestroy() {
      clearInterval(this.updateContentStateInterval);
      this.updateContentState();

      this.$emit('stopTracking');
      window.removeEventListener('resize', this.throttledResizePlayer);
      this.resetState();
    },
    methods: {
      ...mapActions('mediaPlayer', ['setPlayer', 'resetState']),
      isDefaultTrack(langCode) {
        if (!this.captionLanguage) {
          return false;
        }

        const shortLangCode = languageIdToCode(langCode);
        const shortGlobalLangCode = languageIdToCode(this.captionLanguage);

        return shortLangCode === shortGlobalLangCode;
      },
      initPlayer() {
        this.$nextTick(() => {
          this.player = videojs(this.$refs.player, this.getPlayerConfig(), this.handleReadyPlayer);
          this.setPlayer(this.player);
        });
      },
      getPlayerConfig() {
        const videojsConfig = {
          fluid: false,
          fill: true,
          controls: true,
          textTrackDisplay: true,
          bigPlayButton: true,
          preload: 'metadata',
          playbackRates: [0.5, 1.0, 1.25, 1.5, 2.0],
          controlBar: {
            children: [
              { name: 'PlayToggle' },
              { name: 'ReplayButton' },
              { name: 'ForwardButton' },
              { name: 'CurrentTimeDisplay' },
              { name: 'ProgressControl' },
              { name: 'TimeDivider' },
              { name: 'DurationDisplay' },
              {
                name: 'VolumePanel',
                inline: false,
              },
              { name: 'PlaybackRateMenuButton' },
              {
                name: 'CaptionsButton',
                settings: this.settings,
              },
              {
                name: 'LanguagesButton',
                settings: this.settings,
              },
              { name: 'MimicFullscreenToggle' },
            ],
          },
          language: GlobalLangCode,
          languages: {
            [GlobalLangCode]: {
              Play: this.$tr('play'),
              Pause: this.$tr('pause'),
              Replay: this.$tr('replay'),
              Forward: this.$tr('forward'),
              'Current Time': this.$tr('currentTime'),
              'Duration Time': this.$tr('durationTime'),
              Loaded: this.$tr('loaded'),
              Progress: this.coreString('progressLabel'),
              'Progress Bar': this.$tr('progressBar'),
              Fullscreen: this.$tr('fullscreen'),
              'Non-Fullscreen': this.$tr('nonFullscreen'),
              Mute: this.$tr('mute'),
              Unmute: this.$tr('unmute'),
              'Playback Rate': this.$tr('playbackRate'),
              Captions: this.$tr('captions'),
              'captions off': this.$tr('captionsOff'),
              Transcript: this.$tr('transcript'),
              'Transcript off': this.$tr('transcriptOff'),
              Languages: this.$tr('languages'),
              'Volume Level': this.$tr('volumeLevel'),
              'A network error caused the media download to fail part-way.': this.$tr(
                'networkError'
              ),
              'The media could not be loaded, either because the server or network failed or because the format is not supported.': this.$tr(
                'formatError'
              ),
              'The media playback was aborted due to a corruption problem or because the media used features your browser did not support.': this.$tr(
                'corruptionOrSupportError'
              ),
              'No compatible source was found for this media.': this.$tr('sourceError'),
              'The media is encrypted and we do not have the keys to decrypt it.': this.$tr(
                'encryptionError'
              ),
            },
          },
        };

        if (!this.isVideo) {
          videojsConfig.poster = this.audioPoster;
        }

        return videojsConfig;
      },
      handleReadyPlayer() {
        const startTime = this.savedLocation >= this.player.duration() ? 0 : this.savedLocation;
        this.player.currentTime(startTime);
        this.player.play();

        this.player.on('play', () => {
          this.focusOnPlayControl();
          this.setPlayState(true);
        });
        this.player.on('pause', () => {
          this.focusOnPlayControl();
          this.setPlayState(false);
          this.updateContentState();
        });
        this.player.on('timeupdate', this.updateTime);
        this.player.on('seeking', this.handleSeek);
        this.player.on('volumechange', this.throttledUpdateVolume);
        this.player.on('ratechange', this.updateRate);
        this.player.on('ended', () => this.setPlayState(false));

        this.$watch('elementWidth', this.updatePlayerSizeClass);
        this.updatePlayerSizeClass();
        this.resizePlayer();

        this.useSavedSettings();
        this.loading = false;
        this.$refs.player.tabIndex = -1;

        this.updateContentStateInterval = setInterval(this.updateContentState, 30000);
      },
      resizePlayer() {
        if (this.isFullscreen) {
          this.$refs.wrapper.style.height = `100%`;
          return;
        }

        const aspectRatio = 16 / 9;
        const adjustedHeight = this.$refs.wrapper.clientWidth * (1 / aspectRatio);

        this.$refs.wrapper.style.height = `${adjustedHeight}px`;
      },
      throttledResizePlayer: throttle(function resizePlayer() {
        this.resizePlayer();
      }, 300),
      throttledUpdateVolume: throttle(function updateVolume() {
        this.updateVolume();
      }, 1000),
      updateVolume() {
        this.settings.playerVolume = this.player.volume();
        this.settings.playerMuted = this.player.muted();
      },
      updateRate() {
        this.settings.playerRate = this.player.playbackRate();
      },
      useSavedSettings() {
        this.playerVolume = this.settings.playerVolume;
        this.playerMuted = this.settings.playerMuted;
        this.playerRate = this.settings.playerRate;
        this.player.volume(this.playerVolume);
        this.player.muted(this.playerMuted);
        this.player.playbackRate(this.playerRate);
      },
      focusOnPlayControl() {
        this.$refs.wrapper.getElementsByClassName('vjs-play-control')[0].focus();
      },
      handleSeek() {
        // record progress before updating the times,
        // to capture any progress that happened pre-seeking
        this.recordProgress();

        // now, update all the timestamps to set the new time location
        // as the baseline starting point
        this.dummyTime = this.player.currentTime();
        this.lastUpdateTime = this.dummyTime;
        this.progressStartingPoint = this.dummyTime;
      },
      updateTime() {
        // skip out of here if we're currently seeking,
        // so we don't update this.dummyTime before calculating old progress
        if (this.player.seeking()) {
          return;
        }
        this.dummyTime = this.player.currentTime();
        if (this.dummyTime - this.lastUpdateTime >= 5) {
          this.recordProgress();
          this.lastUpdateTime = this.dummyTime;
        }
      },
      setPlayState(state) {
        // avoid recording progress if we're currently seeking,
        // as timers are in an intermediate state
        if (!this.player.seeking()) {
          this.recordProgress();
        }
        if (state === true) {
          this.$emit('startTracking');
        } else {
          this.$emit('stopTracking');
        }
      },
      recordProgress() {
        this.$emit(
          'updateProgress',
          Math.max(
            0,
            (this.dummyTime - this.progressStartingPoint) / Math.floor(this.player.duration())
          )
        );
        this.progressStartingPoint = this.dummyTime;
      },
      updatePlayerSizeClass() {
        this.player.removeClass('player-medium');
        this.player.removeClass('player-small');
        this.player.removeClass('player-tiny');

        if (this.elementWidth < 600) {
          this.player.addClass('player-medium');
        }
        if (this.elementWidth < 480) {
          this.player.addClass('player-small');
        }
        if (this.elementWidth < 360) {
          this.player.addClass('player-tiny');
        }
      },
      updateContentState() {
        const currentLocation = this.player.currentTime();
        let contentState;
        if (this.extraFields) {
          contentState = {
            ...this.extraFields.contentState,
            savedLocation: currentLocation || this.savedLocation,
          };
        } else {
          contentState = { savedLocation: currentLocation || this.savedLocation };
        }
        this.$emit('updateContentState', contentState);
      },
    },
    $trs: {
      replay: 'Go back 10 seconds',
      // Pulled from https://github.com/videojs/video.js/blob/master/lang/en.json
      forward: 'Go forward 10 seconds',
      play: 'Play',
      pause: 'Pause',
      currentTime: 'Current time',
      durationTime: 'Duration time',
      loaded: 'Loaded',
      progressBar: 'Progress bar',
      fullscreen: 'Fullscreen',
      nonFullscreen: 'Non-fullscreen',
      mute: 'Mute',
      unmute: 'Unmute',
      playbackRate: 'Playback rate',
      captions: 'Captions',
      captionsOff: 'Captions off',
      transcript: {
        message: 'Transcript',
        context:
          '\nRefers to the option to present the captions (subtitles) of the video in the form of the interactive transcript.',
      },
      transcriptOff: 'Transcript off',
      languages: 'Languages',
      volumeLevel: 'Volume level',
      networkError: 'A network error caused the media download to fail part-way',
      formatError:
        'The media could not be loaded, either because the server or network failed or because the format is not supported',
      corruptionOrSupportError:
        'The media playback was aborted due to a corruption problem or because the media used features your browser did not support',
      sourceError: 'No compatible source was found for this media',
      encryptionError: 'The media is encrypted and we do not have the keys to decrypt it',
    },
  };

</script>


<style lang="scss" scoped>

  // Unable to reference the videojs using require since videojs doesn't have good webpack support
  @import './videojs-style/video-js.min.css';
  // Custom build icons.
  @import './videojs-style/videojs-font/css/videojs-icons.css';
  @import './videojs-style/variables';
  @import '~kolibri.styles.definitions';

  $transcript-wrap-height: 250px;
  $transcript-wrap-fill-height: 100% * 9 / 16;
  $video-height: 100% * 9 / 16;

  .wrapper {
    box-sizing: content-box;
    max-width: 100%;
    max-height: $video-player-max-height;
  }

  .wrapper.transcript-visible.transcript-wrap {
    padding-bottom: $transcript-wrap-height;
  }

  .wrapper.video-loading video {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0.1;
  }

  .fill-space,
  /deep/ .fill-space {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid transparent;
  }

  .loading-space,
  /deep/ .loading-space {
    box-sizing: border-box;
    padding-top: #{$video-height};
  }

  /deep/ .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .media-player-transcript {
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 0;
    box-sizing: border-box;

    /deep/ .fill-space {
      height: auto;
    }

    [dir='rtl'] & {
      right: auto;
      left: 0;
    }
  }

  .wrapper:not(.transcript-wrap) .media-player-transcript {
    top: 0;
    width: 33.333%;

    /deep/ .loading-space {
      padding-top: #{300% * 9 / 16};
    }
  }

  .wrapper.transcript-wrap .media-player-transcript {
    left: 0;
    height: $transcript-wrap-height;

    /deep/ .loading-space {
      padding-top: 90px;
    }

    [dir='rtl'] & {
      right: 0;
    }
  }

  .normalize-fullscreen,
  .mimic-fullscreen {
    border-color: transparent !important;

    .wrapper {
      max-height: none;
    }

    .wrapper.transcript-visible.transcript-wrap {
      padding-bottom: 0;
    }

    .wrapper.transcript-visible.transcript-wrap .media-player-transcript {
      top: 0;
      height: auto;
      margin-top: #{$video-height};
    }

    .wrapper.transcript-visible.transcript-wrap .video-js.vjs-fill {
      height: auto;
      padding-top: #{$video-height};
    }
  }

  /***** PLAYER OVERRIDES *****/

  /* !!rtl:begin:ignore */

  .transcript-visible:not(.transcript-wrap) > .video-js.vjs-fill {
    width: 66.666%;
  }

  /* Hide control bar when playing & inactive */
  /deep/ .vjs-has-started.vjs-playing.vjs-user-inactive .vjs-control-bar {
    visibility: hidden;

    /* Always show control bar in keyboard modality */
    .keyboard-modality & {
      visibility: visible;
      opacity: 1;
    }
  }

  /* Mimics glow video.js adds on fullscreen button when focused */
  /deep/ .vjs-captions-button.active .vjs-icon-placeholder,
  /deep/ .vjs-languages-button.active .vjs-icon-placeholder {
    text-shadow: 0 0 1em #ffffff;
  }

  /*** CUSTOM VIDEOJS SKIN ***/
  /deep/ .custom-skin {
    $button-height-normal: 40px;
    $button-font-size-normal: 24px;

    @include font-family-noto;

    font-size: $video-player-font-size;
    color: $video-player-font-color;

    /* Sliders */
    .vjs-slider {
      background-color: $video-player-color-2;
    }

    /* Seek Bar */
    .vjs-progress-control {
      height: initial;
      visibility: inherit;
      opacity: inherit;

      .vjs-progress-holder {
        height: 8px;
        margin-right: 16px;
        margin-left: 16px;

        .vjs-load-progress {
          div {
            background: $video-player-color-3;
          }
        }

        .vjs-play-progress {
          &::before {
            top: -5px;
            font-size: 18px;
          }
        }
      }
    }

    /* Control Bar */
    .vjs-control-bar {
      display: flex;
      height: $button-height-normal;
      background-color: $video-player-color;
    }

    /* Fixes volume panel appearing on hover. */
    .vjs-volume-vertical {
      display: none;
    }

    .vjs-volume-panel-vertical {
      &:hover {
        .vjs-volume-vertical {
          display: block;
        }
      }
    }

    .vjs-volume-level {
      background-color: $video-player-font-color;
    }

    /* Buttons */
    .vjs-button {
      .vjs-icon-placeholder {
        &::before {
          font-size: $button-font-size-normal;
          line-height: $button-height-normal;
        }
      }
    }

    /* Replay & Forward Buttons */
    .vjs-icon-replay_10,
    .vjs-icon-forward_10 {
      font-family: VideoJS; // override our global noto fonts with more specificity
      &::before {
        font-size: $button-font-size-normal;
        line-height: $button-height-normal;
      }
    }

    .vjs-big-play-button {
      position: absolute;
      top: 50%;
      left: 50%;
      width: $button-height-normal * 2;
      height: $button-height-normal * 2;
      margin: 0;
      font-size: $button-font-size-normal * 2;
      line-height: $button-height-normal * 2;
      background-color: $video-player-color;
      border: 0;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }

    .vjs-volume-panel {
      margin-left: auto;
    }

    /* Transcript button */
    .vjs-button-transcript img {
      max-width: 20px;
    }

    .vjs-transcript-visible > .vjs-tech,
    .vjs-transcript-visible > .vjs-modal-dialog,
    .vjs-transcript-visible > .vjs-text-track-display,
    .vjs-transcript-visible > .vjs-text-track-settings,
    .vjs-transcript-visible > .vjs-control-bar {
      right: auto;
      width: calc(100% - 330px);
    }

    /* Menus */
    .vjs-menu {
      li {
        padding: 8px;
        font-size: $video-player-font-size;
        background-color: $video-player-color;

        &:focus,
        &:hover {
          background-color: $video-player-color-3;
        }
      }

      li.vjs-selected {
        font-weight: bold;
        color: $video-player-font-color;
        background-color: $video-player-color-2;

        &:focus,
        &:hover {
          background-color: $video-player-color-3;
        }
      }
    }

    .vjs-menu-content {
      @include font-family-noto;
    }

    .vjs-volume-control {
      background-color: $video-player-color;
    }

    .vjs-playback-rate .vjs-menu {
      min-width: 4em;
    }

    /* Time */
    .vjs-current-time {
      display: block;
      padding-right: 0;

      .vjs-current-time-display {
        font-size: $video-player-font-size;
        line-height: $button-height-normal;
      }
    }

    .vjs-duration {
      display: block;
      padding-left: 0;
      .vjs-duration-display {
        font-size: $video-player-font-size;
        line-height: $button-height-normal;
      }
    }

    .vjs-time-divider {
      padding: 0;
      text-align: center;
    }

    /* Rate Button */
    .vjs-playback-rate-value {
      font-size: 20px;
      line-height: $button-height-normal;
    }

    /* Captions Settings */
    .vjs-texttrack-settings {
      display: none;
    }
  }

  /*** MEDIUM: < 600px ***/
  /deep/ .player-medium {
    /* Seek bar moves up. */
    .vjs-progress-control {
      position: absolute;
      top: -16px;
      right: 0;
      left: 0;
      width: auto;
    }

    /* Time divider is displayed. */
    .vjs-time-divider {
      display: block;
    }

    .vjs-slider-bar::before {
      z-index: 0;
    }
  }

  /*** SMALL: < 480px ***/
  /deep/ .player-small {
    $button-height-small: 40px;
    $button-font-size-normal: 24px;

    /* Control bar buttons increase size. */
    .vjs-control-bar {
      height: $button-height-small;
    }

    .vjs-button {
      .vjs-icon-placeholder {
        &::before {
          line-height: $button-height-small;
        }
      }
    }

    .vjs-icon-replay_10,
    .vjs-icon-forward_10 {
      &::before {
        line-height: $button-height-small;
      }
    }

    /* Play, replay, and forward buttons move up. */
    .vjs-play-control,
    .vjs-icon-replay_10,
    .vjs-icon-forward_10 {
      position: absolute;
      top: -75px;
      width: $button-height-small;
      height: $button-height-small;
      background-color: $video-player-color;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }

    .vjs-big-play-button {
      display: none;
    }

    &.vjs-show-big-play-button-on-pause {
      .vjs-big-play-button {
        display: none;
      }
    }

    /* Play button in center. */
    .vjs-play-control {
      left: 50%;
    }

    /* Replay play button on left. */
    .vjs-icon-replay_10 {
      left: 33%;
    }

    /* Forward button on right */
    .vjs-icon-forward_10 {
      left: 66%;
    }

    /* Adjust rate button text */
    .vjs-playback-rate-value {
      line-height: $button-height-small;
    }

    /* Adjust time text */
    .vjs-current-time {
      .vjs-current-time-display {
        line-height: $button-height-small;
      }
    }

    .vjs-duration {
      .vjs-duration-display {
        line-height: $button-height-small;
      }
    }

    .vjs-time-divider {
      line-height: $button-height-small;
    }
  }

  /*** TINY: < 360px ***/
  /deep/ .player-tiny {
    /* Time divider is hidden */
    .vjs-time-divider {
      display: none;
    }

    /* Time duration is hidden */
    .vjs-duration {
      display: none;
    }

    /* Adjust play, replay, and forward buttons positioning. */
    .vjs-play-control,
    .vjs-icon-replay_10,
    .vjs-icon-forward_10 {
      top: -45px;
    }

    /* Adjust replay button position. */
    .vjs-icon-replay_10 {
      left: 25%;
    }

    /* Adjust forward button position. */
    .vjs-icon-forward_10 {
      left: 75%;
    }
  }

  /* !!rtl:end:ignore */

</style>
