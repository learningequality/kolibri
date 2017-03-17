<template>

  <div id="audio-wrapper">
    <div id="play-and-time">
      <button
        @click="togglePlay"
        class="play-button"
      >
        <mat-svg v-if="isPlaying" class="play-icon" category="av" name="pause"/>
        <mat-svg v-else class="play-icon" category="av" name="play_arrow"/>
      </button>
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

  require('html5media/dist/api/1.1.8/html5media');

  module.exports = {

    props: [
      'defaultFile',
    ],

    data: () => ({
      isPlaying: false,
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
        const ieVersion = parseFloat(window.navigator.appVersion.split('MSIE')[1]);
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
        this.isPlaying = true;
        this.recordProgress();
        this.$emit('startTracking');
      },

      pause() {
        this.$refs.audio.pause();
        this.isPlaying = false;
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

  @require '~kolibri.styles.definitions'

  #audio-wrapper
    margin: 8% 5%
    min-width: 500px
    height: 100%

  .play-button
    margin-right: 2%
    width: 44px
    height: 50px
    border: none
    border-radius: 0
    background: none

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
    margin: 1%
    font-size: 20px

  // hacky solution for CSS differences between Chrome and Firefox
  @-moz-document url-prefix()
    #current-time, #total-time
      top: 0

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
    height: 15px
    border-radius: 15px
    background: lightgray
    animate: 0.2s

  input[type=range]::-webkit-slider-thumb
    position: relative
    bottom: 12px
    -webkit-appearance: none
    width: 40px
    height: 40px
    border-radius: 50%
    background: $core-action-normal

  /* Firefox ***********/
  input[type=range]::-moz-range-track
    display: inline-block
    height: 15px
    border-radius: 15px
    background: lightgray
    animate: 0.2s

  input[type=range]::-moz-range-thumb
    width: 40px
    height: 40px
    border: none
    border-radius: 50%
    background: $core-action-normal

  /* IE/Edge **********/
  input[type=range]::-ms-track
    height: 20px
    border: 8px solid transparent
    background: transparent
    color: transparent

  input[type=range]::-ms-thumb
    width: 25px
    height: 25px
    border: none
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

  .play-icon
    fill: $core-action-normal
    transform: scale(3.5)

</style>
