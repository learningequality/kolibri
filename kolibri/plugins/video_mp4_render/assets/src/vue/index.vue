<template>

  <div v-el:videowrapperwrapper class="videowrapperwrapper">
    <loading-spinner v-show="loading"></loading-spinner>
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
  require('./videojs-replay-forward-btns');
  const debounce = require('vue').util.debounce;

  module.exports = {

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
            { name: 'TimeDivider' },
            { name: 'durationDisplay' },
            { name: 'ReplayButton' },
            { name: 'playToggle' },
            { name: 'ForwardButton' },
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

  /* Default videojs stylesheet.
     Unable to reference the videojs using require since videojs doesn't have good webpack support
  */
  @import '../../../../../../node_modules/video.js/dist/video-js.css'

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


  @media screen and (max-width: 840px)
    .video-js
      font-size: 0.8em

  @media screen and (min-width: 841px)
    .video-js
      font-size: 1em

  @media screen and (max-width: 841px)
    .video-js
      .vjs-control-bar,
      .vjs-menu-button .vjs-menu-content
        font-size: 0.8em

  @media screen and (min-width: 841px)
    .video-js
      .vjs-control-bar,
      .vjs-menu-button .vjs-menu-content
        font-size: 1em

  .video-js
    color: white

    &:hover
      .vjs-big-play-button
        background-color: black

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
      background-color: black

    .vjs-slider
      background-color: black

    .vjs-progress-control
      position: absolute
      left: 0
      right: 0
      width: auto
      height: 2em
      top: -1em

    .vjs-progress-holder
      margin: 0

    .vjs-load-progress
      background: grey

    .vjs-play-progress
      background-color: orange

    .vjs-control-bar,
    .vjs-menu-button .vjs-menu-content
      background-color: black

    .vjs-control-bar
      justify-content: center

    .vjs-current-time,
    .vjs-time-divider,
    .vjs-duration,
    .vjs-volume-menu-button,
    .vjs-playback-rate,
    .vjs-fullscreen-control
      position: absolute

    .vjs-current-time
      display: block
      left: 0

    .vjs-time-divider
      display: block
      left: 3em

    .vjs-duration
      display: block
      left: 4em

    .vjs-menu,
      li
        &:focus,
        &:hover
          background-color: grey

    .vjs-volume-menu-button
      right: 6em
      .vjs-slider
        background-color: grey

    .vjs-playback-rate
      right: 3em

    .vjs-fullscreen-control
      right: 0

    .videoreplay
      background: url('../icons/replay.svg')
      background-repeat: no-repeat
      background-position: center
      background-size: 45%

    .videoforward
      background: url('../icons/forward.svg')
      background-repeat: no-repeat
      background-position: center
      background-size: 45%

</style>
