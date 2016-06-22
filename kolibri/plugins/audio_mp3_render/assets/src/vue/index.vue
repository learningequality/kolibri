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

  <audio id="audio" src="http://media.w3.org/2010/07/bunny/04-Death_Becomes_Fur.oga" controls></audio>

</template>


<script>
  
  module.exports = {};

</script>


<style lang="stylus" scoped>

  #audio-wrapper
    margin: 8% 5%

  .timeline
    display: inline-block
    position: relative
    bottom: 20px
    width: 60%
    background: lightgray
    border-radius: 15px
    max-height: 15px
  
  .playhead
    width: 40px
    height: 40px
    border-radius: 50%
    margin-top: -13px
    background: #996182
    
  .play-button
    margin-right: 2%
    background: none

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

</style>
