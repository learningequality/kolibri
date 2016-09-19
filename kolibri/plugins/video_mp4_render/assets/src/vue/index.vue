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
  require('./videojs-centerbtns');
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
          this.videoPlayer.$('.videotoggle').classList.add('videopaused');
          this.videoPlayer.$('.videoreplay').classList.add('display');
          this.videoPlayer.$('.videoforward').classList.add('display');
          this.$emit('startTracking');
        } else {
          this.videoPlayer.$('.videotoggle').classList.remove('videopaused');
          this.videoPlayer.$('.videoreplay').classList.remove('display');
          this.videoPlayer.$('.videoforward').classList.remove('display');
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
        this.videoPlayer.addChild('ReplayButton');
        this.videoPlayer.addChild('ForwardButton');
        this.videoPlayer.addChild('TogglePlayButton');

        const centerButtons = this.$els.videowrapper.childNodes[1];
        const toggleButton = centerButtons
          .getElementsByClassName('videotoggle')[0];
        const replayButton = centerButtons
          .getElementsByClassName('videoreplay')[0];
        const forwardButton = centerButtons
          .getElementsByClassName('videoforward')[0];

        videojs(this.$els.video).on('useractive', () => {
          toggleButton.classList.remove('userInactive');
          replayButton.classList.remove('userInactive');
          forwardButton.classList.remove('userInactive');
        });

        videojs(this.$els.video).on('userinactive', () => {
          toggleButton.classList.add('userInactive');
          replayButton.classList.add('userInactive');
          forwardButton.classList.add('userInactive');
        });

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
        bigPlayButton: false,
        inactivityTimeout: 1000,
        preload: 'metadata',
        // poster: this.posterSource,
        playbackRates: [0.5, 1.0, 1.25, 1.5, 2.0],
        controlBar: {
          children: [
            { name: 'currentTimeDisplay' },
            { name: 'timeDivider' },
            { name: 'progressControl' },
            { name: 'durationDisplay' },
            { name: 'remainingTimeDisplay' },
            { name: 'muteToggle' },
            { name: 'VolumeBar' },
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

  // Default videojs stylesheet
  // Unable to reference the videojs using require since videojs doesn't have good webpack support
  @import '../../../node_modules/video.js/dist/video-js.css'

  // Videojs skin customization
  .video-js
    font-size: 1em
    color: #fff
    margin: 0 auto
    .vjs-slider
      background-color: #545454
      background-color: rgba(84, 84, 84, 0.5)
    .vjs-load-progress
      background: lighten(#545454, 25%)
      background: rgba(84, 84, 84, 0.5)
      div
        background: lighten(#545454, 50%)
        background: rgba(84, 84, 84, 0.75)

  .video-js .vjs-control-bar,
  .video-js .vjs-big-play-button,
  .video-js .vjs-menu-button .vjs-menu-content
    background-color: #000
    background-color: rgba(0, 0, 0, 0.7)

   // Custom style
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
    background-color: #000

  .video-js .vjs-menu
    font-family: 'NotoSans', 'sans-serif'

  .video-js .vjs-current-time
    display: block

  .video-js .vjs-play-progress
    background-color: #996189

  .video-js .userInactive
    visibility: visible
    opacity: 0
    transition: visibility 1s, opacity 1s

  .video-js .videoreplay,
  .video-js .videoforward,
  .video-js .videotoggle
    background-repeat: no-repeat
    background-size: contain
    cursor: pointer
    position: absolute
    top: 50%
    transform: translate(-50%, -50%)

  .video-js .videoreplay,
  .video-js .videoforward
    display: none
    height: 75px
    width: 75px

  .video-js .videoreplay
    background: url('../icons/ic_replay_10_white.svg')
    background-repeat: no-repeat
    background-size: contain
    background-color: rgba(0, 0, 0, 0.3)
    left: calc(50% - 125px)

  .video-js .videoforward
    background: url('../icons/ic_forward_10_white.svg')
    background-repeat: no-repeat
    background-size: contain
    background-color: rgba(0, 0, 0, 0.3)
    left: calc(50% + 125px)

  .video-js .videotoggle
    background: url('../icons/ic_play_circle_outline_white.svg')
    background-repeat: no-repeat
    background-size: contain
    background-color: rgba(0, 0, 0, 0.3)
    left: 50%
    height: 125px
    width: 125px

  .video-js .videopaused
    background: url('../icons/ic_pause_circle_outline_white.svg')
    background-repeat: no-repeat
    background-size: contain
    background-color: rgba(0, 0, 0, 0.3)

  .video-js .display
    display: block

</style>
