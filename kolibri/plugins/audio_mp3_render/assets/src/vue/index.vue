<template>

  <div id="audio-wrapper">
    <div id="play-and-time">
      <button @click="playAudio" class="play-button"><img src="./play.svg"></button>
      <div id="current-time">{{ currentMinutes }} : {{ currentSeconds }}</div>
      <div class="timeline">
        <div class="playhead"></div>
      </div>
      <div id="total-time">{{ totalMinutes }} : {{ totalSeconds }}</div>
    </div>
    <div>
      <button class="audio-button">restart</button>
      <button class="audio-button">- 10s</button>
      <button class="audio-button">+ 10s</button>
    </div>
  </div>

  <audio 
    id="audio" 
    @timeupdate="timeUpdate"
    @loadedmetadata="getDuration"
    v-el:audio 
    src="http://www.stephaniequinn.com/Music/Commercial%20DEMO%20-%2004.mp3">
  </audio>

</template>


<script>

  require('html5media/dist/api/1.1.8/html5media');
  module.exports = {

    props: [
      'totalMinutes',
      'totalSeconds',
      'currentMinutes',
      'currentSeconds',
    ],
    ready() {
      this.currentMinutes = 0;
      this.currentSeconds = 0;
      this.totalMinutes = 0;
    },
    methods: {
      playAudio() {
        if (this.$els.audio.paused) {
          this.$els.audio.play();
        } else {
          this.$els.audio.pause();
        }
      },
      timeUpdate() {
        this.currentSeconds = Math.floor(this.$els.audio.currentTime);
      },
      getDuration() {
        this.audioLength = Math.floor(this.$els.audio.duration);
        this.totalSeconds = this.audioLength;
      },
    },

  };

</script>


<style lang="stylus" scoped></style>
