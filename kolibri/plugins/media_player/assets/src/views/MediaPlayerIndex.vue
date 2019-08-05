<template>

  <div ref="wrapper" :class="['wrapper', $computedClass(progressStyle)]">
    <div v-show="loading" class="fill-space">
      <KCircularLoader
        class="loader"
        :delay="true"
      />
    </div>
    <CoreFullscreen
      v-show="!loading"
      ref="container"
      class="fill-space"
    >
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
    </CoreFullscreen>
  </div>

</template>


<script>

  import vue from 'kolibri.lib.vue';
  import videojs from 'video.js';
  import throttle from 'lodash/throttle';
  import Lockr from 'lockr';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KCircularLoader from 'kolibri.shared.KCircularLoader';
  import ResponsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import { fullscreenApiIsSupported } from 'kolibri.utils.browser';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ReplayButton, ForwardButton, MimicFullscreenToggle } from './customButtons';
  import audioIconPoster from './audio-icon-poster.svg';

  const GlobalLangCode = vue.locale;

  const MEDIA_PLAYER_SETTINGS_KEY = 'kolibriMediaPlayerSettings';

  export default {
    name: 'MediaPlayerIndex',

    components: { KCircularLoader, CoreFullscreen },

    mixins: [commonCoreStrings, ResponsiveElement, contentRendererMixin, themeMixin],

    data: () => ({
      dummyTime: 0,
      progressStartingPoint: 0,
      lastUpdateTime: 0,
      loading: true,
      playerVolume: 1.0,
      playerMuted: false,
      playerRate: 1.0,
      videoLangCode: GlobalLangCode,
      updateContentStateInterval: null,
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
      ReplayButton.prototype.controlText_ = this.$tr('replay');
      ForwardButton.prototype.controlText_ = this.$tr('forward');
      videojs.registerComponent('ReplayButton', ReplayButton);
      videojs.registerComponent('ForwardButton', ForwardButton);
      const { videoLangCode = this.videoLangCode } = this.getSavedSettings();
      this.videoLangCode = videoLangCode;
    },
    mounted() {
      this.initPlayer();
      window.addEventListener('resize', this.throttledResizePlayer);
    },
    beforeDestroy() {
      this.updateContentState();
      this.$emit('stopTracking');
      window.removeEventListener('resize', this.throttledResizePlayer);
      this.player.dispose();
      clearInterval(this.updateContentStateInterval);
    },
    methods: {
      isDefaultTrack(langCode) {
        const shortLangCode = langCode.split('-')[0];
        const shortGlobalLangCode = this.videoLangCode.split('-')[0];
        if (shortLangCode === shortGlobalLangCode) {
          return true;
        }
        return false;
      },
      initPlayer() {
        const videojsConfig = {
          fluid: true,
          aspectRatio: '16:9',
          controls: true,
          textTrackDisplay: true,
          bigPlayButton: true,
          preload: 'metadata',
          playbackRates: [0.5, 1.0, 1.25, 1.5, 2.0],
          controlBar: {
            children: [
              { name: 'playToggle' },
              { name: 'ReplayButton' },
              { name: 'ForwardButton' },
              { name: 'currentTimeDisplay' },
              { name: 'progressControl' },
              { name: 'timeDivider' },
              { name: 'durationDisplay' },
              {
                name: 'volumePanel',
                inline: false,
              },
              { name: 'playbackRateMenuButton' },
              { name: 'captionsButton' },
            ],
          },
          language: GlobalLangCode,
          languages: {
            [GlobalLangCode]: {
              Play: this.$tr('play'),
              Pause: this.$tr('pause'),
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

        // Add appropriate fullscreen button
        if (fullscreenApiIsSupported) {
          videojsConfig.controlBar.children.push({ name: 'fullscreenToggle' });
        } else {
          videojs.registerComponent('MimicFullscreenToggle', MimicFullscreenToggle);
          videojsConfig.controlBar.children.push({ name: 'MimicFullscreenToggle' });
        }

        this.$nextTick(() => {
          this.player = videojs(this.$refs.player, videojsConfig, this.handleReadyPlayer);
        });
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
        this.player.on('mimicFullscreenToggled', () => {
          this.$refs.container.toggleFullscreen();
        });
        this.$watch('elementWidth', this.updatePlayerSizeClass);
        this.updatePlayerSizeClass();
        this.resizePlayer();
        this.useSavedSettings();
        this.loading = false;
        this.$refs.player.tabIndex = -1;

        this.updateContentStateInterval = setInterval(this.updateContentState, 30000);
      },
      resizePlayer() {
        const wrapperWidth = this.$refs.wrapper.clientWidth;
        const aspectRatio = 16 / 9;
        const adjustedHeight = wrapperWidth * (1 / aspectRatio);
        this.$refs.wrapper.setAttribute('style', `height:${adjustedHeight}px`);
      },
      throttledResizePlayer: throttle(function resizePlayer() {
        this.resizePlayer();
      }, 300),

      throttledUpdateVolume: throttle(function updateVolume() {
        this.updateVolume();
      }, 1000),

      getSavedSettings() {
        return Lockr.get(MEDIA_PLAYER_SETTINGS_KEY) || {};
      },
      saveSettings(updatedSettings) {
        const savedSettings = this.getSavedSettings();
        Lockr.set(MEDIA_PLAYER_SETTINGS_KEY, {
          ...savedSettings,
          ...updatedSettings,
        });
      },
      updateVolume() {
        this.saveSettings({
          playerVolume: this.player.volume(),
          playerMuted: this.player.muted(),
        });
      },

      updateRate() {
        this.saveSettings({
          playerRate: this.player.playbackRate(),
        });
      },

      updateLang() {
        const currentTrack = Array.from(this.player.textTracks()).find(
          track => track.mode === 'showing'
        );
        if (currentTrack) {
          this.saveSettings({
            videoLangCode: currentTrack.language,
          });
        }
      },

      useSavedSettings() {
        const {
          savedPlayerVolume = this.playerVolume,
          savedPlayerMuted = this.playerMuted,
          savedPlayerRate = this.playerRate,
        } = this.getSavedSettings();
        this.playerVolume = savedPlayerVolume;
        this.playerMuted = savedPlayerMuted;
        this.playerRate = savedPlayerRate;
        this.player.volume(this.playerVolume);
        this.player.muted(this.playerMuted);
        this.player.playbackRate(this.playerRate);
      },

      focusOnPlayControl() {
        const wrapper = this.$refs.wrapper;
        wrapper.getElementsByClassName('vjs-play-control')[0].focus();
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

  .wrapper {
    width: 854px;
    max-width: 100%;
    height: 480px;
    max-height: 480px;
  }

  .fill-space {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
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
