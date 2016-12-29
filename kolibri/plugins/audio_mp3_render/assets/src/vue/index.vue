<template>

  <div id="audio-wrapper">
    <div id="play-and-time">
      <button
        @click="togglePlay"
        class="play-button"
        :class="{ 'is-play': isPlay, 'is-pause': isPause }"
      ></button>
      <div id="current-time">
        {{ currentMinutes }} : {{ formattedCurrentSec }}
      </div>
      <input
        v-if="notIE9"
        ref="timebar"
        class="timeline"
        type="range"
        min="0"
        :max="max"
        :value="displayTime"
        @change="seekAudio">
      <!--[if lte IE 9]>
      <span> / </span>
      <![endif]-->
      <div id="total-time">
        {{ totalMinutes }} : {{ formattedTotalSec }}
      </div>
    </div>
    <div>
      <button class="audio-button" @click="replay">Replay</button>
      <button class="audio-button" @click="minus20">- 20s</button>
      <button class="audio-button" @click="plus20">+ 20s</button>
    </div>
    <audio
      id="audio"
      ref="audio"
      @timeupdate="updateTime"
      @loadedmetadata="setTotalTime"
      @ended="endPlay"
      :src="defaultFile.storage_url"
    >Your browser cannot play this audio file correctly! Please consider updating your browser to the latest version.</audio>
  </div>

</template>


<script>

  // TODO: move the inline loader to a separate config file
  // once we figured out how to register webpack config files in subtree
  require('imports?this=>window!html5media/dist/api/1.1.8/html5media');

  module.exports = {

    props: [
      'defaultFile',
    ],

    data: () => ({
      isPlay: true,
      isPause: false,
      max: 0,
      displayTime: 0,
      progressStartingPoint: 0,
      lastUpdateTime: 0,
    }),

    computed: {
      totalMinutes() {
        return Math.floor(this.max / 60);
      },

      totalSeconds() {
        return Math.floor(this.max % 60);
      },

      currentSeconds() {
        return Math.floor(this.displayTime % 60);
      },

      currentMinutes() {
        return Math.floor(this.displayTime / 60);
      },

      formattedCurrentSec() {
        return this.formatTime(this.currentSeconds);
      },

      formattedTotalSec() {
        return this.formatTime(this.totalSeconds);
      },
      notIE9() {
      // For version of IE 9 and below, hides the seeker due to incompatibility.
      // This is a short term MVP hack, longer term is to integrate video.js with audio tracks.
        const ieVersion = parseFloat(navigator.appVersion.split('MSIE')[1]);
        if (ieVersion === 9) {
          return false;
        }
        return true;
      },
    },

    beforeDestroy() {
      this.recordProgress();
      this.$emit('stopTracking');
    },

    methods: {
      play() {
        this.$refs.audio.play();
        this.isPlay = false;
        this.isPause = true;
        this.recordProgress();
        this.$emit('startTracking');
      },

      pause() {
        this.$refs.audio.pause();
        this.isPlay = true;
        this.isPause = false;
        this.recordProgress();
        this.$emit('stopTracking');
      },

      togglePlay() {
        if (this.$refs.audio.paused) {
          this.play();
        } else {
          this.pause();
        }
      },

      endPlay() {
        this.pause();
      },

      setTotalTime() {
        this.max = this.$refs.audio.duration;
      },

      /* Adds '0' before seconds (e.g. 1:05 instead of 1:5) */
      formatTime(sec) {
        if (sec < 10) {
          return `0${sec}`;
        }
        return sec;
      },

      replay() {
        this.pause();
        this.$refs.audio.currentTime = 0;
        this.play();
      },

      plus20() {
        const sum = this.displayTime + 20;
        /* Pauses audio at end if +20s goes over the audio duration */
        if (sum > this.max) {
          this.$refs.audio.currentTime = this.max;
          return;
        }
        this.$refs.audio.currentTime = sum;
      },

      minus20() {
        let sum = this.displayTime - 20;
        /* Makes sure minimum time is 0 after -20s */
        if (sum < 0) {
          sum = 0;
        }
        this.$refs.audio.currentTime = sum;
      },

      updateTime() {
        this.displayTime = this.$refs.audio.currentTime;
        if (this.displayTime - this.lastUpdateTime >= 5) {
          this.recordProgress();
          this.lastUpdateTime = this.displayTime;
        }
      },

      seekAudio(e) {
        this.displayTime = e.target.value;
        this.$refs.audio.currentTime = this.displayTime;
      },

      recordProgress() {
        this.$emit('progressUpdate', Math.max((this.displayTime
          - this.progressStartingPoint) / Math.floor(this.max), 0));
        this.progressStartingPoint = this.$refs.audio.currentTime;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  #audio-wrapper
    margin: 8% 5%
    min-width: 500px
    height: 100%

  .play-button
    margin-right: 2%
    background: none
    width: 44px
    height: 50px
    border: none
    border-radius: 0

  .audio-button
    margin: 5% 2% 0 0
    padding: 10px 15px

  .play-button
    &:active
      outline: none
    &:focus
      outline: 1px solid $core-action-normal

  #current-time, #total-time
    display: inline-block
    font-size: 20px
    margin: 1%

  // hacky solution for CSS differences between Chrome and Firefox
  @-moz-document url-prefix()
    #current-time, #total-time
      top: 0

  .is-play
    background: url('./play.svg') no-repeat

  .is-pause
    background: url('./pause.svg') no-repeat

  .timeline
    background: transparent

  input[type=range]
    -webkit-appearance: none
    width: 55%
    -ms-transform: translateY(11px) // position: relative does not work on IE

  input[type=range]:focus, input[type=range]::-moz-focus-outer
    outline: none
    border: none

  /* Chrome, Safari, Opera **********/
  input[type=range]::-webkit-slider-runnable-track
    display: inline-block
    background: lightgray
    border-radius: 15px
    height: 15px
    animate: 0.2s

  input[type=range]::-webkit-slider-thumb
    -webkit-appearance: none
    width: 40px
    height: 40px
    border-radius: 50%
    background: $core-action-normal
    position: relative
    bottom: 12px

  /* Firefox ***********/
  input[type=range]::-moz-range-track
    display: inline-block
    background: lightgray
    border-radius: 15px
    height: 15px
    animate: 0.2s

  input[type=range]::-moz-range-thumb
    width: 40px
    height: 40px
    border-radius: 50%
    background: $core-action-normal
    border: none

  /* IE/Edge **********/
  input[type=range]::-ms-track
    border: 8px solid transparent
    background: transparent
    color: transparent
    height: 20px

  input[type=range]::-ms-thumb
    border: none
    height: 25px
    width: 25px
    border-radius: 50%
    background: $core-action-normal

  input[type=range]::-ms-fill-upper, input[type=range]::-ms-fill-lower
    background: lightgray // overrides IE default background colors of range slider

  /* hides popup label on slider */
  input[type=range]::-ms-tooltip
    display: none

  @media screen and (max-width: $medium-breakpoint + 1)
    #play-and-time
      input
        width: 25%

</style>
