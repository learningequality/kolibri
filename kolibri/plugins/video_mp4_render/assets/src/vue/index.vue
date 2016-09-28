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

      handleHotkey(e) {
        const keyCode = e.keyCode;

        switch (keyCode) {
          case 32: // space = toggle play
            this.togglePlay();
            break;

          case 37: // left = replay
            this.replay();
            break;

          case 39: // right = forward
            this.forward();
            break;

          case 38: // up = increase volume
            this.increaseVolume();
            break;

          case 40: // decrease volume
            this.decreaseVolume();
            break;

          case 77: // m = toggle mute
            this.toggleMute();
            break;

          case 70: // f = toggle full screen
            this.toggleFullScreen();
            break;

          default:
            break;

          // TODO: Other possible hotkeys to handle.
          // < = decrease video speed
          // > increase video speed
          // c closed captions
          // 1 - 9  seek
        }
      },

      togglePlay() {
        if (this.videoPlayer.paused()) {
          this.videoPlayer.play();
        } else {
          this.videoPlayer.pause();
        }
      },

      replay() {
        this.videoPlayer.currentTime(Math.max(0, (this.videoPlayer.currentTime() - 10)));
      },

      forward() {
        this.videoPlayer.currentTime(Math.min(this.videoPlayer.duration(),
          (this.videoPlayer.currentTime() + 10)));
      },

      increaseVolume() {
        this.videoPlayer.volume(this.videoPlayer.volume() + 0.1);
      },

      decreaseVolume() {
        this.videoPlayer.volume(this.videoPlayer.volume() - 0.1);
      },

      toggleMute() {
        this.videoPlayer.muted(!this.videoPlayer.muted());
      },

      toggleFullScreen() {
        if (this.videoPlayer.isFullscreen()) {
          this.videoPlayer.exitFullscreen();
        } else {
          this.videoPlayer.requestFullscreen();
        }
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
      global.addEventListener('keyup', this.handleHotkey);
    },
    beforeDestroy() {
      this.recordProgress();
      this.$emit('stopTracking');
      global.removeEventListener('resize', this.debouncedResizeVideo);
      global.removeEventListener('keyup', this.handleHotkey);
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

  $video-player-color = black
  $video-player-accent-color = #e91e63
  $button-size = 48px
  $font-size = 48px

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
    color: white
    font-family: $core-font
    font-size: 1em
    @media screen and (max-width: 840px)
      font-size: 0.75em

    /// Big Play Button
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
      background-color: grey

    // Seek Bar
    .vjs-progress-control
      position: absolute
      left: 0
      right: 0
      width: auto
      top: -28px
      visibility: inherit
      opacity: inherit
      &:hover
        .vjs-progress-holder
          font-size: 1em

    .vjs-progress-holder
      margin: 7px

    .vjs-load-progress
      background: darkgrey

    .vjs-play-progress
      background-color: $video-player-accent-color

    .vjs-play-progress:before
      color: $video-player-accent-color

    // Control Bar
    .vjs-control-bar,
    .vjs-menu-button, .vjs-menu-content
      background-color: $video-player-color

    .vjs-control-bar
      justify-content: center
      padding-top: 10px
      height: 60px


    .vjs-menu
      li
        &:focus, &:hover
          background-color: grey

        .vjs-selected
          background-color: black
          color: $video-player-accent-color

    .vjs-menu-button-popup .vjs-menu .vjs-menu-content
      background-color: black

    // Buttons
    .vjs-button
      width: $font-size
      height: $font-size
      @media screen and (max-width: 840px)
        width: $font-size * 0.66
        height: $font-size * 0.66

    .vjs-control:before
      font-size: $font-size * 0.66
      line-height: $font-size
      @media screen and (max-width: 840px)
        font-size: $font-size * 0.33
        line-height: $font-size * 0.66

    .vjs-play-control:before
      font-size: $font-size
      @media screen and (max-width: 840px)
        font-size: $font-size * 0.66

    // Replay and Forward Buttons
    .vjs-icon-replay_10
      margin-left: 50px

    .vjs-icon-forward_10
      margin-right: 50px


    // Time
    .vjs-current-time,
    .vjs-duration
      display: block
      position: absolute
      visibility: inherit
      opacity: inherit

    .vjs-current-time
      left: 0

    .vjs-duration
      right: 0

</style>
