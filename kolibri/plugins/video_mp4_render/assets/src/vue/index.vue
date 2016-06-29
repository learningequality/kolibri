<template>

  <div>
    <div class="videowrapper" v-el:videowrapper>
      <video v-el:video class="video-js vjs-default-skin" >
        <source :src="videoUrl" type='video/mp4'>
        <track kind="captions" :src="captionsUrl" :srclang="captionsLang" :label="captionsLabel">
      </video>
    </div>
  </div>

</template>


<script>

  const videojs = require('video.js');
  require('./replayPlayForward');
  let videoPlayer = null;
  module.exports = {

    ready() {
      videoPlayer = videojs(this.$els.video, {
        controls: true,
        autoplay: false,
        fluid: true,
        preload: 'auto',
        poster: this.posterUrl,
        playbackRates: [0.25, 0.5, 1.0, 1.25, 1.5, 2.0],
        textTrackDisplay: true,
        ReplayButton: true,
        ForwardButton: true,
        TogglePlayButton: true,
        bigPlayButton: false,
        controlBar: {
          children: [
            {
              name: 'currentTimeDisplay',
            },
            {
              name: 'timeDivider',
            },
            {
              name: 'progressControl',
            },
            {
              name: 'durationDisplay',
            },
            {
              name: 'remainingTimeDisplay',
            },
            {
              name: 'muteToggle',
            },
            {
              name: 'VolumeBar',
            },
            {
              name: 'playbackRateMenuButton',
            },
            {
              name: 'captionsButton',
            },
            {
              name: 'fullscreenToggle',
            },
          ],
        },
      },
      () => {
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
      });
    },
    data: () => ({
      videoUrl: 'http://clips.vorwaerts-gmbh.de/VfE_html5.mp4',
      posterUrl: 'http://i3.ytimg.com/vi/kITJ6qH7jS0/hqdefault.jpg',
      captionsUrl: require('./en.vtt'),
      captionsLang: 'en',
      captionsLabel: 'English',
      playingState: false,
    }),
    methods: {
      setPlayState(state) {
        this.playState = state;
        if (state === true) {
          videoPlayer.$('.videotoggle').classList.add('videopaused');
          videoPlayer.$('.videoreplay').classList.add('display');
          videoPlayer.$('.videoforward').classList.add('display');
        } else {
          videoPlayer.$('.videotoggle').classList.remove('videopaused');
          videoPlayer.$('.videoreplay').classList.remove('display');
          videoPlayer.$('.videoforward').classList.remove('display');
        }
      },
    },
  };

</script>


<style lang="stylus">

  // Default videojs stylesheet
  @import '../../../../../../node_modules/video.js/dist/video-js.css'

  // Videojs skin customization
  .video-js
    font-size: 1em
    color: #fff
    .vjs-slider
      background-color: #545454
      background-color: rgba(84, 84, 84, 0.5)

    .vjs-load-progress
      background: ligthen(#545454, 25%)
      background: rgba(84, 84, 84, 0.5)
      div
        background: ligthen(#545454, 50%)
        background: rgba(84, 84, 84, 0.75)

  .video-js .vjs-control-bar,
  .video-js .vjs-big-play-button,
  .video-js .vjs-menu-button .vjs-menu-content
    background-color: #000
    background-color: rgba(0, 0, 0, 0.7)

   // Custom style
  .vjs-menu
    font-family: 'NotoSans', 'sans-serif'

  .video-js .vjs-current-time
    display: inline

  .videowrapper
    position: relative

  .video-js .vjs-play-progress
    background-color: #996189

  .video-js .videoreplay
    background: url('../icons/ic_replay_10_white.svg')
    background-repeat: no-repeat
    background-size: contain
    cursor: pointer
    position: absolute
    top: 50%
    left: 40%
    transform: translate(-50%, -50%)
    height: 3em
    width: 3em
    display: none

  .video-js .videoforward
    background: url('../icons/ic_forward_10_white.svg')
    background-repeat: no-repeat
    background-size: contain
    cursor: pointer
    position: absolute
    top: 50%
    left: 60%
    transform: translate(-50%, -50%)
    height: 3em
    width: 3em
    display: none

  .video-js .videotoggle
    background: url('../icons/ic_play_circle_outline_white.svg')
    background-repeat: no-repeat
    background-size: contain
    cursor: pointer
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    height: 7em
    width: 7em

  .video-js .videopaused
    background: url('../icons/ic_pause_circle_outline_white.svg')
    background-repeat: no-repeat
    background-size: contain

  .video-js .userInactive
    visibility: visible
    opacity: 0
    transition: visibility 1s, opacity 1s

  .video-js .vjs-playing .vjs-tech
    pointer-events: none

  .video-js .display
    display: inline

</style>
