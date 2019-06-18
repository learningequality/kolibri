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
          'transcript-visible': isShowingTranscript,
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
          <track
            :key="track.storage_url + '.metadata'"
            kind="metadata"
            :src="track.storage_url"
            :srclang="track.lang.id"
            :label="track.lang.lang_name"
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

      <MediaPlayerTranscript
        ref="transcript"
        :defaultLangCode="defaultLangCode"
        @toggleTranscript="isShowingTranscript = $event"
      />
    </div>
  </MediaPlayerFullscreen>

</template>


<script>

  import vue from 'kolibri.lib.vue';
  import videojs from 'video.js';
  import throttle from 'lodash/throttle';

  import { languageIdToCode } from 'kolibri.utils.i18n';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import ResponsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import ResponsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';

  import Settings from './settings';
  import { ReplayButton, ForwardButton } from './customButtons';
  import MediaPlayerFullscreen from './MediaPlayerFullscreen';
  import MimicFullscreenToggle from './MediaPlayerFullscreen/mimicFullscreenToggle';
  import MediaPlayerTranscript from './MediaPlayerTranscript';
  import TranscriptButton from './MediaPlayerTranscript/transcriptButton';

  import audioIconPoster from './audio-icon-poster.svg';

  const GlobalLangCode = vue.locale;
  const PLAYER_CONFIG = {
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
        { name: 'CaptionsButton' },
        { name: 'MimicFullscreenToggle' },
        { name: 'TranscriptButton' },
      ],
    },
    language: GlobalLangCode,
  };

  const componentsToRegister = {
    MimicFullscreenToggle,
    ReplayButton,
    ForwardButton,
    TranscriptButton,
  };

  Object.entries(componentsToRegister).forEach(([name, component]) =>
    videojs.registerComponent(name, component)
  );

  export default {
    name: 'MediaPlayerIndex',

    components: { KCircularLoader, MediaPlayerFullscreen, MediaPlayerTranscript },

    mixins: [ResponsiveWindow, ResponsiveElement, contentRendererMixin, themeMixin],

    data: () => ({
      dummyTime: 0,
      progressStartingPoint: 0,
      lastUpdateTime: 0,
      loading: true,
      playerVolume: 1.0,
      playerMuted: false,
      playerRate: 1.0,
      defaultLangCode: GlobalLangCode,
      videoLangCode: GlobalLangCode,
      updateContentStateInterval: null,
      isFullscreen: false,
      isShowingTranscript: false,
    }),

    computed: {
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
    },
    created() {
      this.settings = new Settings({
        playerVolume: this.playerVolume,
        playerMuted: this.playerMuted,
        playerRate: this.playerRate,
        videoLangCode: this.videoLangCode,
      });

      this.videoLangCode = this.settings.videoLangCode;
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
      this.player.dispose();
    },
    methods: {
      isDefaultTrack(langCode) {
        const shortLangCode = languageIdToCode(langCode);
        const shortGlobalLangCode = languageIdToCode(this.videoLangCode);

        return shortLangCode === shortGlobalLangCode;
      },
      initPlayer() {
        this.$nextTick(() => {
          this.player = videojs(this.$refs.player, this.getPlayerConfig(), this.handleReadyPlayer);
          this.$refs.fullscreen.setPlayer(this.player);
          this.$refs.transcript.setPlayer(this.player);
        });
      },
      getPlayerConfig() {
        const videojsConfig = Object.assign({}, PLAYER_CONFIG, {
          languages: {
            [GlobalLangCode]: {
              Play: this.$tr('play'),
              Pause: this.$tr('pause'),
              Replay: this.$tr('replay'),
              Forward: this.$tr('forward'),
              'Current Time': this.$tr('currentTime'),
              'Duration Time': this.$tr('durationTime'),
              Loaded: this.$tr('loaded'),
              Progress: this.$tr('progress'),
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
        });

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
        this.player.on('texttrackchange', this.updateLang);
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
          this.$refs.wrapper.style.height = `100vh`;
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

      getTextTracks() {
        return Array.from(this.player.textTracks());
      },

      updateLang() {
        const currentTrack = this.getTextTracks().find(track => track.mode === 'showing');
        if (currentTrack) {
          this.settings.videoLangCode = currentTrack.language;
        }
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
      progress: 'Progress',
      progressBar: 'Progress bar',
      fullscreen: 'Fullscreen',
      nonFullscreen: 'Non-fullscreen',
      mute: 'Mute',
      unmute: 'Unmute',
      playbackRate: 'Playback rate',
      captions: 'Captions',
      captionsOff: 'Captions off',
      transcript: 'Transcript',
      transcriptOff: 'Transcript off',
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
  @import '~kolibri.styles.definitions';

  $transcript-wrap-height: 250px;
  $transcript-wrap-fill-height: 100% * 9 / 16;

  .wrapper {
    box-sizing: content-box;
    max-width: 100%;
    max-height: 562px;
    transition: padding-bottom $core-time ease;
  }

  .wrapper.transcript-visible.transcript-wrap {
    padding-bottom: $transcript-wrap-height;
  }

  .fill-space {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid transparent;
  }

  .loading-space {
    box-sizing: border-box;
    padding-top: calc(100% * 9 / 16);
  }

  .loader {
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
  }

  .wrapper:not(.transcript-wrap) .media-player-transcript {
    top: 0;
    width: 33.333%;
  }

  .wrapper.transcript-wrap .media-player-transcript {
    left: 0;
    height: $transcript-wrap-height;
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
      margin-top: #{$transcript-wrap-fill-height};
    }

    .wrapper.transcript-visible.transcript-wrap .video-js.vjs-fill {
      height: auto;
      padding-top: #{$transcript-wrap-fill-height};
    }
  }

  /***** PLAYER OVERRIDES *****/

  /* !!rtl:begin:ignore */

  /** COLOR PALLETTE **/
  $video-player-color: #212121;
  // tint if $video-player-color = black-ish, shade if $video-player-color = white-ish
  $video-player-color-2: tint($video-player-color, 7%);
  $video-player-color-3: tint($video-player-color, 15%);
  $video-player-font-color: white;

  $video-player-font-size: 12px;

  .video-js.vjs-fill {
    z-index: 1;
    transition: width $core-time ease;
  }

  .transcript-visible:not(.transcript-wrap) > .video-js.vjs-fill {
    width: 66.666%;
  }

  /* Hide control bar when playing & inactive */
  /deep/ .vjs-has-started.vjs-playing.vjs-user-inactive {
    .vjs-control-bar {
      visibility: hidden;
    }
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

    .vjs-transcript-visible > .vjs-transcript {
      display: block;
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
