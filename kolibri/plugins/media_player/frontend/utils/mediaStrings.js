import { createTranslator } from 'kolibri/utils/i18n';

export default createTranslator('MediaPlayerStrings', {
  // Transport controls (shared across audio and video players)
  play: {
    message: 'Play',
    context: 'Button to start media playback.',
  },
  pause: {
    message: 'Pause',
    context: 'Button to pause media playback.',
  },
  replay: {
    message: 'Go back 10 seconds',
    context: 'Button to rewind media by 10 seconds.',
  },
  forward: {
    message: 'Go forward 10 seconds',
    context: 'Button to advance media by 10 seconds.',
  },
  mute: {
    message: 'Mute',
    context: 'Button to mute media.',
  },
  unmute: {
    message: 'Unmute',
    context: 'Button to unmute media.',
  },
  playbackRate: {
    message: 'Playback rate',
    context: 'Button to change media playback speed.',
  },
  progressBar: {
    message: 'Progress bar',
    context: 'Seek bar for navigating through the media.',
  },
  currentTime: {
    message: 'Current time',
    context: 'Indicates the current playback position in the media.',
  },
  durationTime: {
    message: 'Duration time',
    context: 'Indicates the total length of the media.',
  },
  loaded: {
    message: 'Loaded',
    context: 'Indicates the media has loaded into the player.',
  },
  fullscreen: {
    message: 'Enter fullscreen',
    context: 'Button to open the media player in fullscreen view.',
  },
  nonFullscreen: {
    message: 'Exit fullscreen',
    context: 'Button to exit the media player from fullscreen view.',
  },
  volumeLevel: {
    message: 'Volume level',
    context: 'Indicates the volume control.',
  },

  // Caption/transcript controls
  captions: {
    message: 'Captions',
    context: 'Button to access subtitle/caption options in the media player.',
  },
  captionsOff: {
    message: 'Captions off',
    context: 'Option to turn off subtitles (captions) in the media player.',
  },
  transcriptOff: {
    message: 'Transcript off',
    context: 'Option to turn off the transcript.',
  },
  languages: {
    message: 'Languages',
    context: 'Button to access language options for media captions.',
  },

  // Transcript toggle (AudioPlayer)
  showTranscript: {
    message: 'SHOW TRANSCRIPT',
    context: 'Button to display the transcript panel.',
  },
  hideTranscript: {
    message: 'HIDE TRANSCRIPT',
    context: 'Button to hide the transcript panel.',
  },

  // Error messages (used in video.js config)
  networkError: {
    message: 'A network error caused the media download to fail part-way',
    context: 'Error message displayed when a media download fails due to a network error.',
  },
  formatError: {
    message:
      'The media could not be loaded, either because the server or network failed or because the format is not supported',
    context: 'Error message displayed when a media file cannot be loaded.',
  },
  corruptionOrSupportError: {
    message:
      'The media playback was aborted due to a corruption problem or because the media used features your browser did not support',
    context: 'Error message displayed when media playback is aborted.',
  },
  sourceError: {
    message: 'No compatible source was found for this media',
    context: 'Error message displayed when no compatible media source is found.',
  },
  encryptionError: {
    message: 'The media is encrypted and we do not have the keys to decrypt it',
    context: 'Error message displayed when encrypted media cannot be decrypted.',
  },
});
