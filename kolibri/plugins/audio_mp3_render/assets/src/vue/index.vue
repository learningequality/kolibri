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
        v-el:timebar
        class="timeline"
        type="range" min="0" value="0"
        :max="max"
        v-model="rawTime">
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
      v-el:audio
      @timeupdate="updateDummyTime"
      @loadedmetadata="setTotalTime"
      @ended="endPlay"
      :src="defaultFile.storage_url"
    ></audio>

    <h2>Progress: {{ progress }} % <i v-if="saving">Saving Progress...</i></h2>
  </div>

</template>


<script>

  require('html5media/dist/api/1.1.8/html5media');
  module.exports = {

    props: [
      'defaultFile',
    ],

    data: () => ({
      isPlay: true,
      isPause: false,
      max: 0,
      // This data attribute is required, as we cannot use this.$els.audio in our getter for
      // rawTime, because at the time of getter initialization for the computed property,
      // the DOM does not exist, so the above object path is undefined, which causes problems.
      dummyTime: 0,
    }),

    computed: {
      totalMinutes() {
        return Math.floor(this.max / 60);
      },

      totalSeconds() {
        return Math.floor(this.max % 60);
      },

      currentSeconds() {
        return Math.floor(this.rawTime % 60);
      },

      currentMinutes() {
        return Math.floor(this.rawTime / 60);
      },

      formattedCurrentSec() {
        return this.formatTime(this.currentSeconds);
      },

      formattedTotalSec() {
        return this.formatTime(this.totalSeconds);
      },
      rawTime: {
        cache: false,
        get() {
          return this.dummyTime;
        },
        set(value) {
          // Set the actual time here and let the updateDummyTime method take care of updating
          // based on the change event happening here on the currentTime.
          this.$els.audio.currentTime = value;
        },
      },
    },

    beforeDestroy() {
      this.stopTrackingProgress();
    },

    methods: {
      play() {
        this.$els.audio.play();
        this.isPlay = false;
        this.isPause = true;
        this.startTrackingProgress();
      },

      pause() {
        this.$els.audio.pause();
        this.isPlay = true;
        this.isPause = false;
        this.stopTrackingProgress();
      },

      togglePlay() {
        if (this.$els.audio.paused) {
          this.play();
        } else {
          this.pause();
        }
      },

      endPlay() {
        this.pause();
      },

      updateDummyTime() {
        this.dummyTime = this.$els.audio.currentTime;
      },

      setTotalTime() {
        this.max = this.$els.audio.duration;
        this.initContentSession(this.$els.audio.duration);
      },

      /* Adds '0' before seconds (e.g. 1:05 instead of 1:5) */
      formatTime(sec) {
        if (sec < 10) {
          return `0${sec}`;
        }
        return sec;
      },

      replay() {
        this.rawTime = 0;
        this.play();
      },

      plus20() {
        const sum = this.rawTime + 20;
        /* Pauses audio at end if +20s goes over the audio duration */
        if (sum > this.$els.audio.duration) {
          this.rawTime = this.$els.audio.duration;
          this.pause();
          return;
        }
        this.rawTime = sum;
      },

      minus20() {
        let sum = this.rawTime - 20;
        /* Makes sure minimum time is 0 after -20s */
        if (sum < 0) {
          sum = 0;
        }
        this.rawTime = sum;
      },
    },
    vuex: {
      actions: require('learn-actions'),
      getters: {
        progress: (state) => state.pageState.logging.summary.progress,
        saving: (state) => state.pageState.logging.summary.pending_save,
      },
    },

  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

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
    border: 2px solid $core-action-normal
    background: transparent
    padding: 10px 15px
    color: $core-action-normal
    border-radius: 4px

  .play-button, .audio-button
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
    width: 60%
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

</style>