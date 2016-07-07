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
        @click="setTimebar" 
        class="timeline" type="range" min="0" max="100" value="0">
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
    @timeupdate="timeUpdate"
    @loadedmetadata="setTotalTime"
    v-el:audio 
    src=""
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
      timebarChanged: false,
      currentMinutes: 0,
      currentSeconds: 0,
      totalMinutes: 0,
      totalSeconds: 0,
    }),
    computed: {
      formattedCurrentSec() {
        return this.formatTime(this.currentSeconds);
      },
      formattedTotalSec() {
        return this.formatTime(this.totalSeconds);
      },
    },
    ready() {
      this.$els.audio.src = this.defaultFile.storage_url;
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
      /* Adds '0' before seconds (e.g. 1:05 instead of 1:5) */
      formatTime(sec) {
        if (sec < 10) {
          return `0${sec}`;
        }
        return sec;
      },
      setTotalTime() {
        this.totalSeconds = Math.floor(this.$els.audio.duration % 60);
        this.totalMinutes = Math.floor(this.$els.audio.duration / 60);
      },
      /* Gets raw current time and converts to XX:XX format */
      timeUpdate() {
        this.currentSeconds = Math.floor(this.$els.audio.currentTime % 60);
        if (this.currentSeconds === 0 || this.timebarChanged) {
          this.currentMinutes = Math.floor(this.$els.audio.currentTime / 60);
          this.timebarChanged = false;
        }
        if (this.$els.audio.currentTime === this.$els.audio.duration) {
          this.pause();
        }
        /* Proportionally updates position of slider button according to current time */
        this.$els.timebar.value = ((this.$els.audio.currentTime / this.$els.audio.duration) * 100);
      },
      updateTrackUI() {
        this.timebarChanged = true;
        this.timeUpdate();
        this.play();
      },
      /* Updates current time of audio if slider button position changes */
      setTimebar() {
        this.$els.audio.currentTime = (this.$els.timebar.value / 100) * this.$els.audio.duration;
        this.updateTrackUI();
      },
      replay() {
        this.$els.audio.currentTime = 0;
        this.updateTrackUI();
      },
      plus20() {
        const sum = this.$els.audio.currentTime + 20;
        /* Pauses audio at end if +20s goes over the audio duration */
        if (sum > this.$els.audio.duration) {
          this.$els.audio.currentTime = this.$els.audio.duration;
          this.pause();
          return;
        }
        this.$els.audio.currentTime = sum;
        this.updateTrackUI();
      },
      minus20() {
        const sum = this.$els.audio.currentTime - 20;
        /* Makes sure minimum time is 0 after -20s */
        if (sum < 0) {
          this.replay();
        }
        this.$els.audio.currentTime = sum;
        this.updateTrackUI();
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
    color: transparent
    padding: 10px 0
    
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

</style>
