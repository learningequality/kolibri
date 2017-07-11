<template>

  <div ref="wrapper" class="wrapper">
    fullscreenAllowed: {{ fullscreenAllowed }}
    mimicFullscreen: {{ mimicFullscreen }}
    <div v-show="loading" class="fill-space">
      <loading-spinner/>
    </div>
    <div
      v-show="!loading"
      class="fill-space"
      :class="!fullscreenAllowed && mimicFullscreen ? 'mimic-fullscreen' : ''">
      <video ref="video" class="video-js custom-skin">
        <template v-for="video in videoSources">
          <source :src="video.storage_url" :type="`video/${video.extension}`">
        </template>
        <template v-for="track in trackSources">
          <track kind="captions" :src="track.storage_url" :srclang="track.lang" :label="getLangName(track.lang)" :default="isDefaultTrack(track.lang)">
        </template>
      </video>
    </div>
  </div>

</template>


<script>

  import vue from 'kolibri.lib.vue';
  import videojs from 'video.js';
  import LangLookup from './languagelookup';
  import * as customButtons from './videojs-replay-forward-btns';
  import throttle from 'lodash/throttle';
  import Lockr from 'lockr';
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import ResponsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import ScreenFull from 'screenfull';

  const GlobalLangCode = vue.locale;

  export default {
    $trNameSpace: 'videoRender',
    $trs: {
      replay: 'Go back 10 seconds',
      forward: 'Go forward 10 seconds',
    },

    mixins: [ResponsiveElement],

    components: { loadingSpinner },

    props: {
      files: {
        type: Array,
        required: true,
      },
      supplementaryFiles: { type: Array },
      thumbnailFiles: { type: Array },
    },
    data: () => ({
      dummyTime: 0,
      progressStartingPoint: 0,
      lastUpdateTime: 0,
      loading: true,
      videoVolume: 1.0,
      videoMuted: false,
      videoRate: 1.0,
      videoLang: GlobalLangCode,
      mimicFullscreen: false,
    }),

    computed: {
      posterSource() {
        const posterFileExtensions = ['png', 'jpg'];
        const posterArray = this.thumbnailFiles.filter(file =>
          posterFileExtensions.some(ext => ext === file.extension)
        );
        if (posterArray.length === 0) {
          return '';
        }
        return posterArray[0].storage_url;
      },
      videoSources() {
        const videoFileExtensions = ['mp4', 'webm', 'ogg'];
        return this.files.filter(file => videoFileExtensions.some(ext => ext === file.extension));
      },
      trackSources() {
        const trackFileExtensions = ['vtt'];
        return this.supplementaryFiles.filter(file =>
          trackFileExtensions.some(ext => ext === file.extension)
        );
      },
      fullscreenAllowed() {
        return ScreenFull.enabled;
      },
    },
    methods: {
      getLangName(langCode) {
        if (LangLookup[langCode]) {
          return LangLookup[langCode].native_name;
        }
        return langCode;
      },
      isDefaultTrack(langCode) {
        const shortLangCode = langCode.split('-')[0];
        const shortGlobalLangCode = this.videoLang.split('-')[0];
        if (shortLangCode === shortGlobalLangCode) {
          return true;
        }
        return false;
      },
      initPlayer() {
        const videojsConfig = {
          fluid: true,
          aspectRatio: '16:9',
          autoplay: false,
          controls: true,
          textTrackDisplay: true,
          bigPlayButton: false,
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
              { name: 'fullscreenToggle' },
            ],
          },
        };
        this.$nextTick(() => {
          this.videoPlayer = videojs(this.$refs.video, videojsConfig);
          this.videoPlayer.on('loadedmetadata', this.handleReadyPlayer);
        });
      },
      handleReadyPlayer() {
        this.videoPlayer.on('play', this.focusOnPlayControl);
        this.videoPlayer.on('pause', this.focusOnPlayControl);
        this.videoPlayer.on('timeupdate', this.updateTime);
        this.videoPlayer.on('seeking', this.handleSeek);
        this.videoPlayer.on('volumechange', this.throttledUpdateVolume);
        this.videoPlayer.on('ratechange', this.updateRate);
        this.videoPlayer.on('texttrackchange', this.updateLang);
        this.videoPlayer.on('play', () => this.setPlayState(true));
        this.videoPlayer.on('pause', () => this.setPlayState(false));
        this.videoPlayer.on('ended', () => this.setPlayState(false));
        this.$watch('elSize.width', this.updateVideoSizeClass);
        this.updateVideoSizeClass();
        this.resizeVideo();
        this.getDefaults();
        this.loading = false;
        this.$refs.video.tabIndex = -1;
        this.attachFullscreenListener();
      },
      resizeVideo() {
        const wrapperWidth = this.$refs.wrapper.clientWidth;
        const aspectRatio = 16 / 9;
        const adjustedHeight = wrapperWidth * (1 / aspectRatio);
        this.$refs.wrapper.setAttribute('style', `height:${adjustedHeight}px`);
      },
      throttledResizeVideo: throttle(function resizeVideo() {
        this.resizeVideo();
      }, 300),

      throttledUpdateVolume: throttle(function updateVolume() {
        this.updateVolume();
      }, 1000),

      updateVolume() {
        Lockr.set('videoVolume', this.videoPlayer.volume());
        Lockr.set('videoMuted', this.videoPlayer.muted());
      },

      updateRate() {
        Lockr.set('videoRate', this.videoPlayer.playbackRate());
      },

      updateLang() {
        const currentTrack = Array.from(this.videoPlayer.textTracks()).find(
          track => track.mode === 'showing'
        );
        if (currentTrack) {
          Lockr.set('videoLang', currentTrack.language);
        }
      },

      getDefaults() {
        this.videoVolume = Lockr.get('videoVolume') || this.videoVolume;
        this.videoMuted = Lockr.get('videoMuted') || this.videoMuted;
        this.videoRate = Lockr.get('videoRate') || this.videoRate;
        this.videoPlayer.volume(this.videoVolume);
        this.videoPlayer.muted(this.videoMuted);
        this.videoPlayer.playbackRate(this.videoRate);
      },

      focusOnPlayControl() {
        const wrapper = this.$refs.wrapper;
        wrapper.getElementsByClassName('vjs-play-control')[0].focus();
      },
      handleSeek() {
        this.recordProgress();
        this.dummyTime = this.videoPlayer.currentTime();
        this.lastUpdateTime = this.dummyTime;
      },
      updateTime() {
        this.dummyTime = this.videoPlayer.currentTime();
        if (this.dummyTime - this.lastUpdateTime >= 5) {
          this.recordProgress();
          this.lastUpdateTime = this.dummyTime;
        }
      },
      setPlayState(state) {
        this.recordProgress();
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
            (this.dummyTime - this.progressStartingPoint) / Math.floor(this.videoPlayer.duration())
          )
        );
        this.progressStartingPoint = this.videoPlayer.currentTime();
      },
      updateVideoSizeClass() {
        this.videoPlayer.removeClass('player-medium');
        this.videoPlayer.removeClass('player-small');
        this.videoPlayer.removeClass('player-tiny');

        if (this.elSize.width < 600) {
          this.videoPlayer.addClass('player-medium');
        }
        if (this.elSize.width < 480) {
          this.videoPlayer.addClass('player-small');
        }
        if (this.elSize.width < 360) {
          this.videoPlayer.addClass('player-tiny');
        }
      },
      attachFullscreenListener() {
        this.videoPlayer.controlBar.fullscreenToggle.el_.addEventListener(
          'touchend',
          this.handleFullscreen
        );
      },
      handleFullscreen() {
        if (!this.fullscreenAllowed) {
          this.mimicFullscreen = !this.mimicFullscreen;
        }
      },
    },
    created() {
      customButtons.ReplayButton.prototype.controlText_ = this.$tr('replay');
      customButtons.ForwardButton.prototype.controlText_ = this.$tr('forward');
      videojs.registerComponent('ReplayButton', customButtons.ReplayButton);
      videojs.registerComponent('ForwardButton', customButtons.ForwardButton);
      this.videoLang = Lockr.get('videoLang') || this.videoLang;
    },
    mounted() {
      this.initPlayer();
      window.addEventListener('resize', this.throttledResizeVideo);
    },
    beforeDestroy() {
      this.recordProgress();
      this.$emit('stopTracking');
      window.removeEventListener('resize', this.throttledResizeVideo);
      this.videoPlayer.dispose();
    },
  };

</script>


<style lang="stylus" scoped>

  // Unable to reference the videojs using require since videojs doesn't have good webpack support
  @import '../../../node_modules/video.js/dist/video-js.css'
  // Custom build icons.
  @import '../videojs-font/css/videojs-icons.css'

  .wrapper
    width: 854px
    height: 480px
    max-width: 100%
    max-height: 480px

  .fill-space
    width: 100%
    height: 100%

  .mimic-fullscreen
    position: fixed
    top: 0
    right: 0
    bottom: 0
    left: 0
    z-index: 24
    max-width: 100vw
    max-height: 100vh
    width: 100vw
    height: 100vh

</style>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  $dark-grey = #212121
  $grey = #303030
  $light-grey = #424242
  $video-player-color = $dark-grey
  $video-player-accent-color = $core-action-normal
  $video-player-font-size = 12px



  /*** CUSTOM VIDEOJS SKIN ***/
  .custom-skin
    $button-height-normal = 40px
    $button-font-size-normal = 24px


    font-size: $video-player-font-size
    font-family: $core-font
    color: white

    /* Sliders */
    .vjs-slider
      background-color: $grey


    /* Seek Bar */
    .vjs-progress-control
      visibility: inherit
      opacity: inherit
      height: initial

      .vjs-progress-holder
        height: 8px
        margin-left: 16px
        margin-right: 16px

        .vjs-load-progress
          div
            background: $light-grey

        .vjs-play-progress
          background-color: $video-player-accent-color

          &:before
            color: $video-player-accent-color
            font-size: 18px
            top: -5px


    /* Control Bar */
    .vjs-control-bar
      display: flex
      height: $button-height-normal
      background-color: $video-player-color

    /* Fixes volume panel appearing on hover. */
    .vjs-volume-vertical
      display: none

    .vjs-volume-panel-vertical
      &:hover
        .vjs-volume-vertical
          display: block


    /* Buttons */
    .vjs-button
      .vjs-icon-placeholder
        &:before
          line-height:$button-height-normal
          font-size: $button-font-size-normal

    /* Replay & Forward Buttons */
    .vjs-icon-replay_10, .vjs-icon-forward_10
      &:before
        line-height: $button-height-normal
        font-size: $button-font-size-normal

    .vjs-volume-panel
      margin-left: auto

    /* Menus */
    .vjs-menu
      li
        padding: 8px
        font-size: $video-player-font-size
        background-color:  $dark-grey

        &:focus, &:hover
          background-color: $light-grey

      li.vjs-selected
        background-color: $grey
        color: white
        font-weight: bold

        &:focus, &:hover
          background-color: $light-grey

    .vjs-menu-content
      font-family: $core-font

    .vjs-volume-control
      background-color: $video-player-color

    .vjs-playback-rate .vjs-menu
      min-width: 4em


    /* Time */
    .vjs-current-time
      display: block
      padding-right: 0

      .vjs-current-time-display
        line-height: $button-height-normal
        font-size: $video-player-font-size

    .vjs-duration
      display: block
      padding-left: 0
      .vjs-duration-display
        line-height: $button-height-normal
        font-size: $video-player-font-size

    .vjs-time-divider
      padding: 0
      text-align: center


    /* Rate Button */
    .vjs-playback-rate-value
      line-height: $button-height-normal
      font-size: 20px


    /* Captions Settings */
    .vjs-texttrack-settings
      display: none



  /*** MEDIUM: < 600px ***/
  .player-medium
    /* Seek bar moves up. */
    .vjs-progress-control
      position: absolute
      top: -16px
      right: 0
      left: 0
      width: auto

    /* Time divider is displayed. */
    .vjs-time-divider
      display: block



  /*** SMALL: < 480px ***/
  .player-small
    $button-height-small = 44px
    $button-font-size-normal = 24px


    /* Control bar buttons increase size. */
    .vjs-control-bar
      height: $button-height-small

    .vjs-button
      .vjs-icon-placeholder
        &:before
          line-height: $button-height-small

    .vjs-icon-replay_10, .vjs-icon-forward_10
      &:before
        line-height: $button-height-small

    /* Play, replay, and forward buttons move up. */
    .vjs-play-control, .vjs-icon-replay_10, .vjs-icon-forward_10
      position: absolute
      transform: translate(-50%, -50%)
      top: -75px
      background-color: $video-player-color
      border-radius: 50%
      height: 48px

    /* Play button in center. */
    .vjs-play-control
      left: 50%

    /* Replay play button on left. */
    .vjs-icon-replay_10
      left: 33%

    /* Forward button on right */
    .vjs-icon-forward_10
      left: 66%

    /* Adjust rate button text */
    .vjs-playback-rate-value
      line-height: $button-height-small

    /* Adjust time text */
    .vjs-current-time
      .vjs-current-time-display
        line-height: $button-height-small

    .vjs-duration
      .vjs-duration-display
        line-height: $button-height-small

    .vjs-time-divider
      line-height: $button-height-small


  /*** TINY: < 360px ***/
  .player-tiny
    /* Time divider is hidden */
    .vjs-time-divider
      display: none

    /* Time duration is hidden */
    .vjs-duration
      display: none

    /* Adjust play, replay, and forward buttons positioning. */
    .vjs-play-control, .vjs-icon-replay_10, .vjs-icon-forward_10
      top: -45px

    /* Adjust replay button position. */
    .vjs-icon-replay_10
      left: 25%

    /* Adjust forward button position. */
    .vjs-icon-forward_10
      left: 75%

</style>
