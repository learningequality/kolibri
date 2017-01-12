<template>

  <div ref="wrapper" class="wrapper">
    <loading-spinner v-if="loading"/>
    <video ref="video" class="video-js vjs-default-skin" @seeking="handleSeek" @timeupdate="updateTime">
      <template v-for="video in videoSources">
        <source :src="video.storage_url" :type="'video/' + video.extension">
      </template>
      <template v-for="track in trackSources">
        <track kind="captions" :src="track.storage_url" :srclang="track.lang" :label="getLangName(track.lang)">
      </template>
    </video>
  </div>

</template>


<script>

  const videojs = require('video.js');
  const langcodes = require('./langcodes.json');
  const customButtons = require('./videojs-replay-forward-btns');
  const throttle = require('lodash.throttle');

  module.exports = {

    $trNameSpace: 'videoRender',

    $trs: {
      replay: 'Skip back 10 seconds.',
      forward: 'Skip forward 10 seconds.',
    },

    props: ['files'],

    data: () => ({
      dummyTime: 0,
      progressStartingPoint: 0,
      lastUpdateTime: 0,
      loading: true,
    }),

    computed: {
      posterSource() {
        const posterFileExtensions = ['png', 'jpg'];
        const posterArray = this.files.filter(
          (file) => posterFileExtensions.some((ext) => ext === file.extension)
        );
        if (posterArray.length === 0) {
          return '';
        }
        return posterArray[0].storage_url;
      },

      videoSources() {
        const videoFileExtensions = ['mp4', 'webm', 'ogg'];
        return this.files.filter(
          (file) => videoFileExtensions.some((ext) => ext === file.extension)
        );
      },

      trackSources() {
        const trackFileExtensions = ['vtt'];
        return this.files.filter(
          (file) => trackFileExtensions.some((ext) => ext === file.extension)
        );
      },
    },

    methods: {
      getLangName(langCode) {
        return langcodes.filter(
          (lang) => lang.code === langCode
        )[0].lang;
      },

      setPlayState(state) {
        this.recordProgress();
        if (state === true) {
          this.$emit('startTracking');
        } else {
          this.$emit('stopTracking');
        }
      },

      loadedMetaData() {
        this.resizeVideo();
        this.videoPlayerIsReady();
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

      videoPlayerIsReady() {
        videojs(this.$refs.video).on('play', () => {
          this.setPlayState(true);
        });

        videojs(this.$refs.video).on('pause', () => {
          this.setPlayState(false);
        });

        videojs(this.$refs.video).on('ended', () => {
          this.setPlayState(false);
        });
      },

      updateTime() {
        this.dummyTime = this.videoPlayer.currentTime();
        if (this.dummyTime - this.lastUpdateTime >= 5) {
          this.recordProgress();
          this.lastUpdateTime = this.dummyTime;
        }
      },

      /* Catches when a user jumps around/skips while playing the video */
      handleSeek() {
        /* Record any progress up to this point */
        this.recordProgress();
        /* Set last check to be where player is at now */
        this.dummyTime = this.videoPlayer.currentTime();
        this.lastUpdateTime = this.dummyTime;
      },

      recordProgress() {
        this.$emit('progressUpdate', Math.max(0,
          (this.dummyTime - this.progressStartingPoint) /
          Math.floor(this.videoPlayer.duration())));
        this.progressStartingPoint = this.videoPlayer.currentTime();
      },

      focusOnPlayControl() {
        const wrapper = this.$refs.wrapper;
        wrapper.getElementsByClassName('vjs-play-control')[0].focus();
      },
    },

    created() {
      customButtons.ReplayButton.prototype.controlText_ = this.$tr('replay');
      customButtons.ForwardButton.prototype.controlText_ = this.$tr('forward');
      videojs.registerComponent('ReplayButton', customButtons.ReplayButton);
      videojs.registerComponent('ForwardButton', customButtons.ForwardButton);
    },

    mounted() {
      this.$nextTick(() => {
        this.videoPlayer = videojs(this.$refs.video, {
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
                name: 'VolumeMenuButton',
                inline: false,
                vertical: true,
              },
              { name: 'playbackRateMenuButton' },
              { name: 'captionsButton' },
              { name: 'fullscreenToggle' },
            ],
          },
        });

        this.videoPlayer.on('loadedmetadata', this.loadedMetaData);
        this.videoPlayer.on('play', this.focusOnPlayControl);
        this.videoPlayer.on('pause', this.focusOnPlayControl);
        global.addEventListener('resize', this.throttledResizeVideo);
      });
    },

    beforeDestroy() {
      this.recordProgress();
      this.$emit('stopTracking');
      global.removeEventListener('resize', this.throttledResizeVideo);
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

</style>


<style lang="stylus">

  // UNSCOPED

  @require '~kolibri.styles.coreTheme'

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
