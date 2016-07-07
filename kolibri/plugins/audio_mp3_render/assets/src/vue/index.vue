<template>

  <div id="audio-wrapper">
    <div id="play-and-time">
      <button id="audio-play" class="play-button"><img src="./play.svg"></button>
      <div id="current-time">00:00</div>
      <div class="timeline">
        <div class="playhead"></div>
      </div>
      <div id="total-time">XX:XX</div>
    </div>
    <div>
      <button class="audio-button">restart</button>
      <button class="audio-button">- 10s</button>
      <button class="audio-button">+ 10s</button>
    </div>
  </div>

  <audio id="audio" src="http://www.stephaniequinn.com/Music/Commercial%20DEMO%20-%2004.mp3" controls></audio>

</template>


<script>
  
  require('html5media/dist/api/1.1.8/html5media');
  module.exports = {};

</script>


<style lang="stylus" scoped></style>
