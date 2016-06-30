<template>

  <div id="audio-wrapper">
    <div id="play-and-time">
      <button 
        @click="togglePlay" 
        class="play-button" 
        :class="{ 'is-play': isPlay.status, 'is-pause': isPause.status }"
        ></button>
      <div id="current-time">
        {{ formattedCurrentMin }} : {{ formattedCurrentSec }}
      </div>
      <input 
        v-el:timebar 
        @click="setTimebar" 
        class="timeline" type="range" min="0" max="100" value="0"
        ><div id="total-time">
        {{ formattedTotalMin }} : {{ formattedTotalSec }}
      </div>
    </div>
    <div>
      <button class="audio-button" @click="restart">restart</button>
      <button class="audio-button" @click="minus20">- 20s</button>
      <button class="audio-button" @click="plus20">+ 20s</button>
    </div>
  </div>

  <audio 
    id="audio" 
    @timeupdate="timeUpdate"
    @loadedmetadata="setTotalTime"
    v-el:audio 
    src="http://www.stephaniequinn.com/Music/Commercial%20DEMO%20-%2004.mp3"
    ></audio>

</template>


<script>

  const logging = require('loglevel');
  require('html5media/dist/api/1.1.8/html5media');
  module.exports = {

    data: () => ({
      isPlay: {
        type: Boolean,
        status: true,
      },
      isPause: {
        type: Boolean,
        status: false,
      },
      timebarChanged: {
        type: Boolean,
        status: false,
      },
      currentMinutes: {
        type: Number,
        min: 0,
      },
      currentSeconds: {
        type: Number,
        sec: 0,
      },
      totalMinutes: {
        type: Number,
        totalmin: 0,
      },
      totalSeconds: {
        type: Number,
        totalsec: 0,
      },
    }),
    computed: {
      formattedCurrentSec() {
        return this.formatTime(this.currentSeconds.sec);
      },
      formattedTotalSec() {
        return this.formatTime(this.totalSeconds.totalsec);
      },
      formattedCurrentMin() {
        return this.formatTime(this.currentMinutes.min);
      },
      formattedTotalMin() {
        return this.formatTime(this.totalMinutes.totalmin);
      },
    },
    methods: {
      play() {
        this.$els.audio.play();
        this.isPlay.status = false;
        this.isPause.status = true;
      },
      pause() {
        this.$els.audio.pause();
        this.isPlay.status = true;
        this.isPause.status = false;
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
        this.totalSeconds.totalsec = Math.floor(this.$els.audio.duration % 60);
        this.totalMinutes.totalmin = Math.floor(this.$els.audio.duration / 60);
      },
      /* Gets raw current time and converts to XX:XX format */
      timeUpdate() {
        this.currentSeconds.sec = Math.floor(this.$els.audio.currentTime % 60);
        if (this.currentSeconds.sec === 0 || this.timebarChanged.status) {
          this.currentMinutes.min = Math.floor(this.$els.audio.currentTime / 60);
          logging.info(this.currentMinutes.min);
          this.timebarChanged.status = false;
        }
        /* Proportionally updates position of slider button according to current time */
        this.$els.timebar.value = ((this.$els.audio.currentTime / this.$els.audio.duration) * 100);
      },
      updatePlay() {
        this.timebarChanged.status = true;
        this.timeUpdate();
        this.play();
      },
      /* Updates current time of audio if slider button position changes */
      setTimebar() {
        this.$els.audio.currentTime = (this.$els.timebar.value / 100) * this.$els.audio.duration;
        this.updatePlay();
      },
      restart() {
        this.$els.audio.currentTime = 0;
        this.updatePlay();
      },
      plus20() {
        this.$els.audio.currentTime = this.$els.audio.currentTime + 20;
        this.updatePlay();
      },
      minus20() {
        this.$els.audio.currentTime = this.$els.audio.currentTime - 20;
        if (this.$els.audio.currentTime < 0) {
          this.$els.audio.currentTime = 0;
          this.updatePlay();
        }
        this.updatePlay();
      },
    },

  };

</script>


<style lang="stylus" scoped>

  #audio-wrapper
    margin: 8% 5%
    
  input[type=range]
    -webkit-appearance: none
    display: inline-block
    width: 60%
    background: lightgray
    bottom: 20px
    position: relative
    bottom: 20px
    border-radius: 15px
    max-height: 15px

  input[type=range]::-webkit-slider-thumb
    -webkit-appearance: none
    width: 40px
    height: 40px
    border-radius: 50%
    background: #996182

  input[type=range]:focus
    outline: none
    
  .play-button
    margin-right: 2%
    background: none
    width: 50px
    height: 50px

  .audio-button
    margin: 5% 2% 0 0
    background: gray

  .play-button, .audio-button
    border: none
    
  #current-time, #total-time
    display: inline-block
    font-size: 20px
    margin: 1%
    position: relative
    bottom: 20px
    
  .is-play
    background: url('./play.svg') no-repeat
    
  .is-pause
    background: url('./pause.svg') no-repeat

</style>
