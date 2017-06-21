<template>

  <div ref="wrapper" class="wrapper">
    <div v-show="loading" class="fill-space">
      <loading-spinner/>
    </div>
    <div v-show="!loading" class="fill-space">
      <video ref="video" class="video-js vjs-default-skin">
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

  const { locale: GlobalLangCode } = require('kolibri.lib.vue');
  const videojs = require('video.js');
  const LangLookup = require('./languagelookup');
  const customButtons = require('./videojs-replay-forward-btns');
  const throttle = require('lodash/throttle');
  const Lockr = require('lockr');


  module.exports = {

    $trNameSpace: 'videoRender',

    $trs: {
      replay: 'Go back 10 seconds',
      forward: 'Go forward 10 seconds',
    },

    components: {
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
    },

    props: {
      files: {
        type: Array,
        required: true,
      },
      supplementaryFiles: {
        type: Array,
      },
      thumbnailFiles: {
        type: Array,
      },
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
    }),

    computed: {
      posterSource() {
        const posterFileExtensions = ['png', 'jpg'];
        const posterArray = this.thumbnailFiles.filter(
          file => posterFileExtensions.some(ext => ext === file.extension));
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
        return this.supplementaryFiles.filter(
          file => trackFileExtensions.some(ext => ext === file.extension));
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
          bigPlayButton: true,
          inactivityTimeout: 1000,
          preload: 'metadata',
          // poster: this.posterSource,
          playbackRates: [0.5, 1.0, 1.25, 1.5, 2.0],
          controlBar: {
            children: [
              { name: 'playToggle' },
              { name: 'ReplayButton' },
              { name: 'ForwardButton' },
              { name: 'currentTimeDisplay' },
              { name: 'timeDivider' },
              { name: 'durationDisplay' },
              { name: 'progressControl' },
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
        this.resizeVideo();
        this.getDefaults();
        this.loading = false;
        this.$refs.video.tabIndex = -1;
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
        const currentTrack = Array.from(this.videoPlayer.textTracks()).find(track => track.mode === 'showing');
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

      /* Catches when a user jumps around/skips while playing the video */
      handleSeek() {
        /* Record any progress up to this point */
        this.recordProgress();
        /* Set last check to be where player is at now */
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
        this.$emit('updateProgress', Math.max(0,
          (this.dummyTime - this.progressStartingPoint) /
          Math.floor(this.videoPlayer.duration())));
        this.progressStartingPoint = this.videoPlayer.currentTime();
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

  // Containers
  .wrapper
    width: 854px
    height: 480px
    max-width: 100%
    max-height: 480px

  .fill-space
    width: 100%
    height: 100%

</style>


<style lang="stylus">

  // UNSCOPED

  @require '~kolibri.styles.definitions'

  // Shades of Grey
  $dark-grey = #212121
  $grey = #303030
  $light-grey = #424242

  // Video player colors and sizing
  $video-player-color = $dark-grey
  $video-player-accent-color = #9c27b0
  $video-player-font-size = 14px

  // Video Player
  .video-js
    font-size: $video-player-font-size
    font-family: $core-font
    font-weight: bold
    color: white

    // Responsiveness
    @media screen and (max-width: 840px)
      font-size: 13px
    @media screen and (max-width: 620px)
      font-size: 11px

    // Big Play Button
    .vjs-big-play-button
      position: absolute
      top: 50%
      left: 50%
      transform: translate(-50%, -50%)
      height: 2em
      width: 2em
      border-radius: 50%
      border: none
      background-color: $video-player-color

    .vjs-big-play-button:before
      font-size: 2em
      line-height: 1em

    &:hover
      .vjs-big-play-button
        background-color: $video-player-color

    // Sliders
    .vjs-slider
      background-color: $light-grey

    // Seek Bar
    .vjs-progress-control
      position: absolute
      left: 0
      right: 0
      width: auto
      top: -3em
      visibility: inherit
      opacity: inherit

      &:hover
        .vjs-progress-holder
          font-size: 1em

        .vjs-time-tooltip,
        .vjs-mouse-display:after,
        .vjs-play-progress:after
          font-size: calc(1em - 2px)

    .vjs-progress-holder
      margin-left: 7px
      margin-right: 7px
      font-size: 1em
      margin-top: auto

    .vjs-load-progress
      background: $grey

    .vjs-play-progress
      background-color: $video-player-accent-color

    .vjs-play-progress:before
      color: $video-player-accent-color

    // Control Bar
    .vjs-control-bar,
    .vjs-menu-button, .vjs-menu-content
      background-color: $video-player-color

    .vjs-control-bar
      display: flex

    // Menus
    .vjs-menu
      li
        font-weight: bold
        &:focus, &:hover
          background-color: $grey

        .vjs-selected
          background-color: $light-grey
          color: $video-player-accent-color

    .vjs-menu-button-popup .vjs-menu .vjs-menu-content
      background-color: $video-player-color

    .vjs-menu li.vjs-selected
      background-color: $video-player-color
      color: $video-player-accent-color

    // Time
    .vjs-current-time,
    .vjs-duration,
    .vjs-time-divider
      display: inline-block

    .vjs-current-time
      padding-right: 0

    .vjs-time-divider
      padding: 0
      text-align: center

    .vjs-duration
      padding-left: 0

    .vjs-volume-menu-button
      margin-left: auto

</style>
