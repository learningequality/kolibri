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
      replay: 'Replay',
      forward: 'Forward',
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
        this.$els.videowrapper.childNodes[1]
          .getElementsByClassName('vjs-control-bar')[0]
          .getElementsByClassName('vjs-captions-button')[0]
          .classList.remove('vjs-hidden');
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
            { name: 'progressControl' },
            { name: 'currentTimeDisplay' },
            { name: 'durationDisplay' },
            {
              name: 'VolumeMenuButton',
              inline: false,
              vertical: true,
            },
            { name: 'playbackRateMenuButton' },
            { name: 'ReplayButton' },
            { name: 'playToggle' },
            { name: 'ForwardButton' },
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

  // Default videojs stylesheet
  // Unable to reference the videojs using require since videojs doesn't have good webpack support
  @import '../../../node_modules/video.js/dist/video-js.css'
  @require '~kolibri/styles/coreTheme'

  $video-player-color = black
  $video-player-accent-color = #ffc107

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

  .video-js
    font-size: 1em
    font-family: $core-font

  .video-js
    .vjs-control-bar,
    .vjs-menu-button .vjs-menu-content
      font-size: 1em

  .video-js
    color: white

    .vjs-button
      width: 48px
      height: 48px

    &:hover
      .vjs-big-play-button
        background-color: $video-player-color

    .vjs-big-play-button
      position: absolute
      top: 50%
      left: 50%
      transform: translate(-50%, -50%)
      height: 2.5em
      width: 2.5em
      font-size: 2.5em
      line-height: 2.5em
      border-radius: 50%
      border: none
      background-color: $video-player-colo

    .vjs-volume-menu-button,
    .vjs-playback-rate-value,
    .videoreplay,
    .videoforward,
    .vjs-captions,
    .vjs-fullscreen-control
      font-size: 0.75em

    .vjs-slider
      background-color: grey

    .vjs-progress-control
      position: absolute
      left: 0
      right: 0
      width: auto
      height: 2em
      top: -1em
      visibility: inherit
      opacity: inherit

    .vjs-progress-holder
      margin: 0

    .vjs-load-progress
      background: darkgrey

    .vjs-play-progress
      background-color: $video-player-accent-color

    .vjs-progress-control
      &:hover
        .vjs-progress-holder
          font-size: 1em

    .vjs-control-bar,
    .vjs-menu-button .vjs-menu-content
      background-color: $video-player-color

    .vjs-control-bar
      justify-content: center

    .vjs-current-time,
    .vjs-duration
      position: absolute
      visibility: inherit
      opacity: inherit
      top: 0
      font-size: 0.5em

    .vjs-current-time-display,
    .vjs-duration-display
      font-size: 16px

    .vjs-current-time
      display: block
      left: 0
      width: 48px
      height: 48px
      color: $video-player-accent-color

    .vjs-duration
      display: block
      right: 0

    .vjs-menu
      li
        &:focus,
        &:hover
          background-color: grey

    .vjs-volume-menu-button
      .vjs-slider
        background-color: grey

    .videoreplay
      background: url('../icons/replay.svg')
      background-repeat: no-repeat
      background-position: center
      background-size: 45%
      bottom: 0

    .videoforward
      background: url('../icons/forward.svg')
      background-repeat: no-repeat
      background-position: center
      background-size: 45%
      bottom: 0

    .vjs-captions-button
      display: block

    .vjs-control:before
      line-height: 48px
      font-size: 36px

    .vjs-play-control:before
      font-size: 48px

    .vjs-play-progress:before
      color: $video-player-accent-color

    .vjs-menu li.vjs-selected
      background-color: black
      color: $video-player-accent-color

</style>
