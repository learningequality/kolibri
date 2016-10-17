<template>

  <div v-el:videowrapperwrapper class="videowrapperwrapper">
    <loading-spinner v-if="loading"></loading-spinner>
    <div v-el:videowrapper v-show="!loading" class="videowrapper">
      <video v-el:video class="video-js vjs-default-skin" @seeking="handleSeek" @timeupdate="updateTime">
        <template v-for="video in videoSources">
          <source :src="video.storage_url" :type="'video/' + video.extension">
        </template>
        <template v-for="track in trackSources">
          <track kind="captions" :src="track.storage_url" :srclang="track.lang" :label="getLangName(track.lang)">
        </template>
      </video>
    </div>
  </div>

</template>


<script>

  const videojs = require('video.js');
  const langcodes = require('./langcodes.json');
  const customButtons = require('./videojs-replay-forward-btns');
  const debounce = require('vue').util.debounce;

  module.exports = {

    $trNameSpace: 'videoRender',

    $trs: {
      replay: 'Skip back 10 seconds.',
      forward: 'Skip forward 10 seconds.',
    },

    props: ['files'],

    data: () => ({
      videoWidth: 0,
      videoHeight: 0,
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

      aspectRatio() {
        return this.videoWidth / this.videoHeight;
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
        this.videoWidth = this.videoPlayer.videoWidth();
        this.videoHeight = this.videoPlayer.videoHeight();
        this.resizeVideo();
        this.videoPlayerIsReady();
        this.loading = false;
      },

      resizeVideo() {
        const wrapperWrapperWidth = this.$els.videowrapperwrapper.clientWidth;
        const wrapperWrapperHeight = this.$els.videowrapperwrapper.clientHeight;

        const neededHeightGivenWidth = wrapperWrapperWidth * (1 / this.aspectRatio);
        const neededWidthGivenHeight = wrapperWrapperHeight * this.aspectRatio;

        let newWidth = 0;
        let newHeight = 0;

        if (neededHeightGivenWidth <= wrapperWrapperHeight) {
          newWidth = wrapperWrapperWidth;
          newHeight = neededHeightGivenWidth;
        } else {
          newWidth = neededWidthGivenHeight;
          newHeight = wrapperWrapperHeight;
        }

        this.$els.videowrapper.setAttribute('style', `width:${newWidth}px;height:${newHeight}px`);
      },

      get debouncedResizeVideo() {
        return debounce(this.resizeVideo, 300);
      },

      videoPlayerIsReady() {
        videojs(this.$els.video).on('play', () => {
          this.setPlayState(true);
        });

        videojs(this.$els.video).on('pause', () => {
          this.setPlayState(false);
        });

        videojs(this.$els.video).on('ended', () => {
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
    },

    created() {
      customButtons.ReplayButton.prototype.controlText_ = this.$tr('replay');
      customButtons.ForwardButton.prototype.controlText_ = this.$tr('forward');
      videojs.registerComponent('ReplayButton', customButtons.ReplayButton);
      videojs.registerComponent('ForwardButton', customButtons.ForwardButton);
    },

    ready() {
      this.videoPlayer = videojs(this.$els.video, {
        fluid: true,
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
      global.addEventListener('resize', this.debouncedResizeVideo);
    },
    beforeDestroy() {
      this.recordProgress();
      this.$emit('stopTracking');
      global.removeEventListener('resize', this.debouncedResizeVideo);
      this.videoPlayer.dispose();
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri/styles/coreTheme'
  // Unable to reference the videojs using require since videojs doesn't have good webpack support
  @import '../../../node_modules/video.js/dist/video-js.css'
  // Custom build icons.
  @import '../videojs-font/css/videojs-icons.css'

  // Shades of Grey
  $dark-grey = #212121
  $grey = #303030
  $light-grey = #424242

  // Video player colors and sizing
  $video-player-color = $dark-grey
  $video-player-accent-color = #9c27b0
  $video-player-font-size = 14px

  // Containers
  .videowrapperwrapper
    width: 100%
    height: 100%
    background-color: rgba(0, 0, 0, 0)
    position: relative

  .videowrapper
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    position: relative
    height: 100%
    background-color: black

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
      top: calc(1em - 56px)
      visibility: inherit
      opacity: inherit

      &:hover
        .vjs-progress-holder
          font-size: 1em

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
      display: block
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

    .vjs-volume-menu-button
      margin-left: auto

</style>
