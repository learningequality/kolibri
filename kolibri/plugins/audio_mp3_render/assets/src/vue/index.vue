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
  </div>

  <audio
    id="audio" 
    v-el:audio
    @timeupdate="updateDummyTime"
    @loadedmetadata="setTotalTime"
    :src="defaultFile.storage_url"
  ></audio>

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

    methods: {
      play() {
        this.$els.audio.play();
        this.isPlay = false;
        this.isPause = true;
      },

      pause() {
        this.$els.audio.pause();
        this.isPlay = true;
        this.isPause = false;
      },

      togglePlay() {
        if (this.$els.audio.paused) {
          this.play();
        } else {
          this.pause();
        }
      },

      updateDummyTime() {
        this.dummyTime = this.$els.audio.currentTime;
      },

      setTotalTime() {
        this.max = this.$els.audio.duration;
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

  };

</script>


<style lang="stylus" scoped>

  #audio-wrapper
    margin: 8% 5%
    
  .play-button
    margin-right: 2%
    background: none
    width: 50px
    height: 50px
    border: none

  .audio-button
    margin: 5% 2% 0 0
    border: 2px solid #996182
    background: transparent
    padding: 10px 15px
    color: #996182
    border-radius: 4px
    
  .play-button:focus, .audio-button:focus
    outline: none
    
  #current-time, #total-time
    display: inline-block
    font-size: 20px
    margin: 1%
    position: relative
    bottom: 20px
    
  @-moz-document url-prefix()
    #current-time, #total-time
      top: 0

  .is-play
    background: url('./play.svg') no-repeat
    
  .is-pause
    background: url('./pause.svg') no-repeat
    
  .timeline
    background: transparent
    
  .timeline:focus
    outline: none
    
  input[type=range]
    -webkit-appearance: none
    width: 60%
        
  input[type=range]:focus, input[type=range]::-moz-focus-outer
    outline: none
    border: none
    
  /* Chrome, Safari, Opera **********/
  input[type=range]::-webkit-slider-runnable-track
    display: inline-block
    background: lightgray
    border-radius: 15px
    height: 15px
    position: relative
    bottom: 20px
    animate: 0.2s
    
  input[type=range]::-webkit-slider-thumb
    -webkit-appearance: none
    width: 40px
    height: 40px
    border-radius: 50%
    background: #996182
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
    background: #996182
    border: none
    
  /* IE/Edge **********/
  input[type=range]::-ms-track
    border: 3px solid transparent
    background: transparent
    color: transparent
    padding: 15px 0
    
  input[type=range]::-ms-thumb
    border: none
    height: 40px
    width: 40px
    border-radius: 50%
    background: #996182
    
  input[type=range]::-ms-fill-upper
    background: lightgray

  input[type=range]::-ms-fill-lower
    background: gray

  /* hides popup label on slider */
  input[type=range]::-ms-tooltip
    display: none

</style>