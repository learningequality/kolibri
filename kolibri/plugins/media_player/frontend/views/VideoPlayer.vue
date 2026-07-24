<template>

  <div>
    <MediaPlayerFullscreen
      class="fill-space fullscreen-wrapper"
      :style="{
        'border-color': $themeTokens.fineLine,
        padding: fullscreenWrapperPadding,
      }"
      @changeFullscreen="isFullscreen = $event"
    >
      <!-- Keyed on the source: video.js removes the element it wrapped when the
      player is disposed, so re-init needs a freshly mounted <video> tag. Keying
      the tag itself does not work — video.js has moved it into its own wrapper,
      so Vue's replacement insert is a no-op. -->
      <div
        :key="defaultFile && defaultFile.storage_url"
        ref="wrapper"
        :style="{
          '--video-primary': $themeTokens.primary,
          '--video-unbuffered': $themePalette.grey.v_200,
          '--video-fineline': $themeTokens.fineLine,
          '--video-focus': $themeTokens.focusOutline,
        }"
        :class="[
          'wrapper',
          {
            'keyboard-modality': $inputModality === 'keyboard',
            'video-loading': loading,
            'transcript-visible': transcriptVisible,
            'transcript-wrap': transcriptWrap,
          },
        ]"
      >
        <div
          v-show="loading"
          class="fill-space loading-space"
        >
          <KCircularLoader
            class="loader"
            :delay="true"
          />
        </div>

        <video
          ref="playerRef"
          class="custom-skin video-js"
        >
          <source
            v-for="video in videoSources"
            :key="video.storage_url"
            :src="video.storage_url"
            :type="`video/${video.extension}`"
          >
          <track
            v-for="track in trackSources"
            :key="track.storage_url"
            kind="captions"
            :src="track.storage_url"
            :srclang="track.lang.id"
            :label="track.lang.lang_name"
            :default="isDefaultTrack(track.lang.id)"
          >
        </video>

        <MediaPlayerTranscript
          v-if="transcriptVisible"
          ref="transcript"
          :style="transcriptStyle"
        />
      </div>
    </MediaPlayerFullscreen>
  </div>

</template>


<script>

  import vue, { computed, ref, watch, getCurrentInstance } from 'vue';
  import videojs from 'video.js';
  import { useThrottleFn, useEventListener } from '@vueuse/core';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useKResponsiveElement from 'kolibri-design-system/lib/composables/useKResponsiveElement';
  import useMediaPlayer, { PLAYBACK_RATES } from '../composables/useMediaPlayer';
  import { VIDEO_PRESETS } from '../utils/fileExtractors';
  import mediaStrings from '../utils/mediaStrings';
  import { ReplayButton, ForwardButton, BigPlayToggle } from './customButtons';
  import MediaPlayerFullscreen from './MediaPlayerFullscreen';
  import MimicFullscreenToggle from './MediaPlayerFullscreen/mimicFullscreenToggle';
  import MediaPlayerTranscript from './MediaPlayerTranscript';
  import CaptionsButton from './MediaPlayerCaptions/captionsButton';
  import LanguagesButton from './MediaPlayerLanguages/languagesButton';

  const GlobalLangCode = vue.locale;
  const componentsToRegister = {
    MimicFullscreenToggle,
    ReplayButton,
    ForwardButton,
    BigPlayToggle,
    CaptionsButton,
    LanguagesButton,
  };
  Object.entries(componentsToRegister).forEach(([name, component]) =>
    videojs.registerComponent(name, component),
  );

  export default {
    name: 'VideoPlayer',
    components: { MediaPlayerFullscreen, MediaPlayerTranscript },
    setup(props, context) {
      const instance = getCurrentInstance().proxy;
      const { windowIsSmall, windowIsPortrait } = useKResponsiveWindow();
      const { elementWidth } = useKResponsiveElement();
      const wrapper = ref(null);
      const playerRef = ref(null);
      const isFullscreen = ref(false);

      // Initialize media player composable
      const {
        player,
        files,
        defaultFile,
        captionTracks,
        transcript,
        trackSources,
        isDefaultTrack,
        loading,
      } = useMediaPlayer(context, {
        wrapperRef: wrapper,
        playerRef,
        getPlayerConfig,
        onReady() {
          const focusOnPlayControl = () => {
            player.value.controlBar.getChild('PlayToggle')?.el().focus();
          };
          player.value.on('play', focusOnPlayControl);
          player.value.on('pause', focusOnPlayControl);

          // BigPlayButton is disabled in the player config; we add our own
          // BigPlayToggle (which switches between play/pause icons) plus
          // skip back/forward buttons as a centered cluster on the player.
          // Default player children (with bigPlayButton: false) are:
          // [mediaLoader, posterImage, textTrackDisplay, loadingSpinner,
          //  liveTracker, controlBar, ...]
          // Insert at index 4 so they sit between loadingSpinner and liveTracker.
          player.value.addChild('ReplayButton', {}, 4);
          player.value.addChild('BigPlayToggle', {}, 5);
          player.value.addChild('ForwardButton', {}, 6);

          updatePlayerSizeClass();
          resizePlayer();
        },
      });

      // Computed
      const videoSources = computed(() => {
        return files.value.filter(file => VIDEO_PRESETS.has(file.preset));
      });

      const transcriptVisible = computed(() => {
        return transcript.value && !loading.value && captionTracks.value.length > 0;
      });

      const transcriptWrap = computed(() => {
        return windowIsPortrait.value || (!isFullscreen.value && windowIsSmall.value);
      });

      const transcriptStyle = computed(() => {
        const border = `1px solid ${instance.$themeTokens.fineLine}`;
        if (!transcriptWrap.value) {
          // Inline directional style: RTLCSS cannot flip inline styles, so pick
          // the leading edge explicitly.
          return instance.isRtl ? { borderRight: border } : { borderLeft: border };
        }
        return { borderTop: border };
      });

      const fullscreenWrapperPadding = computed(() => {
        if (isFullscreen.value) {
          return 0;
        }
        return transcriptWrap.value ? '16px' : '32px 24px';
      });

      // Functions
      function updatePlayerSizeClass() {
        if (!player.value) return;
        player.value.removeClass('player-medium');
        player.value.removeClass('player-small');
        player.value.removeClass('player-tiny');
        if (elementWidth.value < 600) {
          player.value.addClass('player-medium');
        }
        if (elementWidth.value < 480) {
          player.value.addClass('player-small');
        }
        if (elementWidth.value < 360) {
          player.value.addClass('player-tiny');
        }
      }

      function resizePlayer() {
        // Can fire as a trailing throttled call after unmount, when wrapper is null.
        if (!wrapper.value) {
          return;
        }
        if (isFullscreen.value) {
          wrapper.value.style.height = '100%';
          return;
        }
        const aspectRatio = 16 / 9;
        const adjustedHeight = wrapper.value.clientWidth * (1 / aspectRatio);
        wrapper.value.style.height = `${adjustedHeight}px`;
      }

      const throttledResizePlayer = useThrottleFn(resizePlayer, 300);
      // useEventListener auto-removes the listener when the component unmounts.
      useEventListener(window, 'resize', throttledResizePlayer);

      function getPlayerConfig() {
        const controlBarChildren = [
          { name: 'PlayToggle' },
          { name: 'CurrentTimeDisplay' },
          { name: 'ProgressControl' },
          { name: 'TimeDivider' },
          { name: 'DurationDisplay' },
          {
            name: 'VolumePanel',
            inline: false,
          },
          { name: 'PlaybackRateMenuButton' },
          {
            name: 'CaptionsButton',
            vueParent: instance,
          },
          {
            name: 'LanguagesButton',
            vueParent: instance,
          },
          { name: 'MimicFullscreenToggle' },
        ];
        return {
          fluid: false,
          fill: true,
          controls: true,
          textTrackDisplay: true,
          // We use BigPlayToggle (added at runtime via addChild) instead of
          // the default BigPlayButton, so the centered overlay button can
          // toggle between play and pause icons based on player state.
          bigPlayButton: false,
          preload: 'metadata',
          playbackRates: PLAYBACK_RATES,
          controlBar: {
            children: controlBarChildren,
          },
          language: GlobalLangCode,
          languages: {
            [GlobalLangCode]: {
              Play: mediaStrings.play$(),
              Pause: mediaStrings.pause$(),
              Replay: mediaStrings.replay$(),
              Forward: mediaStrings.forward$(),
              'Current Time': mediaStrings.currentTime$(),
              'Duration Time': mediaStrings.durationTime$(),
              Loaded: mediaStrings.loaded$(),
              Progress: coreString('progressLabel'),
              'Progress Bar': mediaStrings.progressBar$(),
              Fullscreen: mediaStrings.fullscreen$(),
              'Non-Fullscreen': mediaStrings.nonFullscreen$(),
              Mute: mediaStrings.mute$(),
              Unmute: mediaStrings.unmute$(),
              'Playback Rate': mediaStrings.playbackRate$(),
              Captions: mediaStrings.captions$(),
              'captions off': mediaStrings.captionsOff$(),
              Transcript: coreString('transcript'),
              'Transcript off': mediaStrings.transcriptOff$(),
              Languages: mediaStrings.languages$(),
              'Volume Level': mediaStrings.volumeLevel$(),
              'A network error caused the media download to fail part-way.':
                mediaStrings.networkError$(),
              'The media could not be loaded, either because the server or network failed or because the format is not supported.':
                mediaStrings.formatError$(),
              'The media playback was aborted due to a corruption problem or because the media used features your browser did not support.':
                mediaStrings.corruptionOrSupportError$(),
              'No compatible source was found for this media.': mediaStrings.sourceError$(),
              'The media is encrypted and we do not have the keys to decrypt it.':
                mediaStrings.encryptionError$(),
            },
          },
        };
      }

      // Watchers
      // Registered here in setup (not in onReady) so it is scope-disposed on
      // unmount; guarded in updatePlayerSizeClass for the pre-ready null player.
      watch(elementWidth, () => updatePlayerSizeClass());
      watch(isFullscreen, () => resizePlayer());

      return {
        wrapper,
        playerRef,
        defaultFile,
        isFullscreen,
        videoSources,
        transcriptVisible,
        transcriptWrap,
        transcriptStyle,
        fullscreenWrapperPadding,
        loading,
        trackSources,
        isDefaultTrack,
      };
    },
  };

</script>


<style lang="scss" scoped>

  // Unable to reference the videojs using require since videojs doesn't have good webpack support
  @import './videojs-style/video-js.min.css';
  // Custom build icons.
  @import './videojs-style/videojs-font/css/videojs-icons.css';
  @import './videojs-style/variables';
  @import '~kolibri-design-system/lib/styles/definitions';

  .fullscreen-wrapper {
    box-sizing: border-box;
  }

  .wrapper {
    box-sizing: content-box;
    max-width: 100%;
    max-height: #{$video-player-max-vh};
  }

  .wrapper.transcript-visible.transcript-wrap {
    padding-bottom: #{$transcript-wrap-height};
  }

  .wrapper.video-loading video {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0.1;
  }

  .fill-space,
  /deep/ .fill-space {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid transparent;
  }

  .loading-space,
  /deep/ .loading-space {
    box-sizing: border-box;
    padding-top: #{$video-player-height-by-width};
  }

  /deep/ .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .media-player-transcript {
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 0;
    box-sizing: border-box;

    /deep/ .fill-space {
      height: auto;
    }

    [dir='rtl'] & {
      right: auto;
      left: 0;
    }
  }

  .wrapper:not(.transcript-wrap) .media-player-transcript {
    position: absolute;
    top: 0;
    width: 33.333%;

    /deep/ .loading-space {
      padding-top: #{300% * 9 / 16};
    }
  }

  .wrapper.transcript-wrap .media-player-transcript {
    position: relative;
    left: 0;
    height: #{$transcript-wrap-height};
    max-height: 200px;

    /deep/ .loading-space {
      padding-top: 90px;
    }

    [dir='rtl'] & {
      right: 0;
    }
  }

  .normalize-fullscreen,
  .mimic-fullscreen {
    border-color: transparent !important;

    .wrapper {
      max-height: none;
    }

    .wrapper.transcript-visible.transcript-wrap {
      padding-bottom: 0;
    }

    .wrapper.transcript-visible.transcript-wrap .media-player-transcript {
      top: 0;
      height: calc(100vh - #{$video-player-height-vw});
    }

    .wrapper.transcript-visible.transcript-wrap .video-js.vjs-fill {
      height: #{$video-player-height-vw};
    }
  }

  /***** PLAYER OVERRIDES *****/

  /* !!rtl:begin:ignore */
  .transcript-visible:not(.transcript-wrap) > .video-js.vjs-fill {
    width: 66.666%;
  }

  /* Hide control bar when playing & inactive */
  /deep/ .vjs-has-started.vjs-playing.vjs-user-inactive .vjs-control-bar {
    visibility: hidden;

    /* Always show control bar in keyboard modality */
    .keyboard-modality & {
      visibility: visible;
      opacity: 1;
    }
  }

  /* Mimics glow video.js adds on fullscreen button when focused */
  /deep/ .vjs-captions-button.active .vjs-icon-placeholder,
  /deep/ .vjs-languages-button.active .vjs-icon-placeholder {
    text-shadow: 0 0 1em #ffffff;
  }

  /*** CUSTOM VIDEOJS SKIN ***/
  /deep/ .custom-skin {
    $button-height-normal: 40px;
    $button-font-size-normal: 24px;
    @include font-family-noto;

    font-size: $video-player-font-size;
    color: $video-player-font-color;

    /* Sliders */
    .vjs-slider {
      background-color: $video-player-color-2;
    }

    /* Seek Bar */
    .vjs-progress-control {
      height: initial;
      visibility: inherit;
      opacity: inherit;

      .vjs-progress-holder {
        height: 8px;
        margin-right: 16px;
        margin-left: 16px;
        background-color: var(--video-unbuffered);

        .vjs-load-progress {
          background: transparent;

          div {
            background: rgba(255, 255, 255, 0.5);
          }
        }

        .vjs-play-progress {
          background-color: var(--video-primary);

          // The blob: a font-icon character (filled circle) rendered via
          // ::before. Stack 1px text-shadows in 8 directions to produce a
          // fineLine outline around the character.
          &::before {
            top: -5px;
            font-size: 18px;
            text-shadow:
              -1px -1px 0 var(--video-fineline),
              1px -1px 0 var(--video-fineline),
              -1px 1px 0 var(--video-fineline),
              1px 1px 0 var(--video-fineline),
              -1px 0 0 var(--video-fineline),
              1px 0 0 var(--video-fineline),
              0 -1px 0 var(--video-fineline),
              0 1px 0 var(--video-fineline);
          }
        }
      }
    }

    /* Control Bar — transparent so controls float over the video */
    .vjs-control-bar {
      display: flex;
      height: $button-height-normal;
      background-color: transparent;
    }

    /* Fixes volume panel appearing on hover. */
    .vjs-volume-vertical {
      display: none;
    }

    .vjs-volume-panel-vertical {
      &:hover {
        .vjs-volume-vertical {
          display: block;
        }
      }
    }

    .vjs-volume-level {
      background-color: $video-player-font-color;
    }

    /* Buttons */
    .vjs-button {
      .vjs-icon-placeholder {
        &::before {
          font-size: $button-font-size-normal;
          line-height: $button-height-normal;
        }
      }
    }

    /* Replace video.js's default text-shadow glow with the KDS focus
       outline (colour bound on the wrapper element as --video-focus). */
    .vjs-control:focus {
      text-shadow: none;
      outline: 2px solid var(--video-focus);
      outline-offset: 2px;
    }

    /* Replay & Forward Buttons */
    .vjs-icon-replay_10,
    .vjs-icon-forward_10 {
      font-family: VideoJS; // override our global noto fonts with more specificity
      &::before {
        font-size: $button-font-size-normal;
        line-height: $button-height-normal;
      }
    }

    /* Centered overlay play/pause toggle (BigPlayToggle, our PlayToggle
       subclass added at runtime). Styled to match the prior BigPlayButton. */
    > .vjs-control.vjs-big-play-toggle {
      position: absolute;
      top: 50%;
      left: 50%;
      width: $button-height-normal * 2;
      height: $button-height-normal * 2;
      margin: 0;
      color: white;
      background-color: var(--video-primary);
      border: 0;
      border-radius: 50%;
      transform: translate(-50%, -50%);

      // The play/pause icon is a font character rendered by the inner
      // placeholder's ::before. Size it explicitly so it fills the button
      // rather than using the default small control-bar size.
      .vjs-icon-placeholder::before {
        font-size: $button-font-size-normal * 2;
        line-height: $button-height-normal * 2;
      }
    }

    /* Skip back/forward buttons sit on the player as siblings of BigPlayButton.
       Override video.js's default `.video-js .vjs-control { height: 100% }`
       which would otherwise make them cover the entire video. */
    $skip-button-size: $button-height-normal * 1.2;

    > .vjs-control.vjs-icon-replay_10,
    > .vjs-control.vjs-icon-forward_10 {
      position: absolute;
      top: 50%;
      width: $skip-button-size;
      height: $skip-button-size;
      color: white;
      // Translucent dark underlay to keep the white glyph legible against
      // light video frames or text behind the button.
      background-color: rgba(0, 0, 0, 0.5);
      border: 0;
      border-radius: 50%;
      transform: translateY(-50%);

      // The icon character is rendered by ::before; size it relative to
      // the button and use line-height matching the button height for
      // vertical centering. Higher-specificity overrides the existing
      // .vjs-icon-replay_10::before rule.
      &::before {
        font-size: $skip-button-size * 0.55;
        line-height: $skip-button-size;
      }
    }

    > .vjs-control.vjs-icon-replay_10 {
      right: calc(50% + #{$button-height-normal * 1.5});
    }

    > .vjs-control.vjs-icon-forward_10 {
      left: calc(50% + #{$button-height-normal * 1.5});
    }

    /* Match the visibility rule video.js uses for the control bar: only
       hide the centered overlay buttons (BigPlayToggle + skip buttons)
       when the video is actively playing AND the user is inactive. In
       all other states (initial, paused, or hovered) they show. */
    &.vjs-has-started.vjs-playing.vjs-user-inactive > .vjs-control.vjs-big-play-toggle,
    &.vjs-has-started.vjs-playing.vjs-user-inactive > .vjs-control.vjs-icon-replay_10,
    &.vjs-has-started.vjs-playing.vjs-user-inactive > .vjs-control.vjs-icon-forward_10 {
      display: none;
    }

    .vjs-volume-panel {
      margin-left: auto;
    }

    /* Transcript button */
    .vjs-button-transcript img {
      max-width: 20px;
    }

    .vjs-transcript-visible > .vjs-tech,
    .vjs-transcript-visible > .vjs-modal-dialog,
    .vjs-transcript-visible > .vjs-text-track-display,
    .vjs-transcript-visible > .vjs-text-track-settings,
    .vjs-transcript-visible > .vjs-control-bar {
      right: auto;
      width: calc(100% - 330px);
    }

    /* Menus */
    .vjs-menu {
      li {
        padding: 8px;
        font-size: $video-player-font-size;
        background-color: $video-player-color;

        &:focus,
        &:hover {
          background-color: $video-player-color-3;
        }
      }

      li.vjs-selected {
        font-weight: bold;
        color: $video-player-font-color;
        background-color: $video-player-color-2;

        &:focus,
        &:hover {
          background-color: $video-player-color-3;
        }
      }
    }

    .vjs-menu-content {
      @include font-family-noto;
    }

    .vjs-volume-control {
      background-color: $video-player-color;
    }

    .vjs-playback-rate .vjs-menu {
      min-width: 4em;
    }

    /* Time */
    .vjs-current-time {
      display: block;
      padding-right: 0;

      .vjs-current-time-display {
        font-size: $video-player-font-size;
        line-height: $button-height-normal;
      }
    }

    .vjs-duration {
      display: block;
      padding-left: 0;

      .vjs-duration-display {
        font-size: $video-player-font-size;
        line-height: $button-height-normal;
      }
    }

    .vjs-time-divider {
      padding: 0;
      text-align: center;
    }

    /* Rate Button */
    .vjs-playback-rate-value {
      font-size: 20px;
      line-height: $button-height-normal;
    }

    /* Captions Settings */
    .vjs-texttrack-settings {
      display: none;
    }
  }

  /*** MEDIUM: < 600px ***/
  /deep/ .player-medium {
    /* Seek bar moves up. */
    .vjs-progress-control {
      position: absolute;
      top: -16px;
      right: 0;
      left: 0;
      width: auto;
    }

    /* Time divider is displayed. */
    .vjs-time-divider {
      display: block;
    }

    .vjs-slider-bar::before {
      z-index: 0;
    }
  }

  /*** SMALL: < 480px ***/

  /* Shrink the centred overlay cluster (BigPlayToggle + skip buttons) so it
     fits a narrow viewport. Compound selectors match the desktop sizing
     rules' specificity, so source order wins. */
  /deep/ .player-small {
    $small-play-size: 56px;
    $small-skip-size: 36px;

    > .vjs-control.vjs-big-play-toggle {
      width: $small-play-size;
      height: $small-play-size;

      .vjs-icon-placeholder::before {
        font-size: $small-play-size * 0.5;
        line-height: $small-play-size;
      }
    }

    > .vjs-control.vjs-icon-replay_10,
    > .vjs-control.vjs-icon-forward_10 {
      width: $small-skip-size;
      height: $small-skip-size;

      &::before {
        font-size: $small-skip-size * 0.55;
        line-height: $small-skip-size;
      }
    }

    > .vjs-control.vjs-icon-replay_10 {
      right: calc(50% + #{$small-play-size * 0.6});
    }

    > .vjs-control.vjs-icon-forward_10 {
      left: calc(50% + #{$small-play-size * 0.6});
    }
  }

  /*** TINY: < 360px ***/
  /deep/ .player-tiny {
    $tiny-play-size: 44px;
    $tiny-skip-size: 30px;

    /* Time divider and duration hidden — only current time fits. */
    .vjs-time-divider,
    .vjs-duration {
      display: none;
    }

    > .vjs-control.vjs-big-play-toggle {
      width: $tiny-play-size;
      height: $tiny-play-size;

      .vjs-icon-placeholder::before {
        font-size: $tiny-play-size * 0.5;
        line-height: $tiny-play-size;
      }
    }

    > .vjs-control.vjs-icon-replay_10,
    > .vjs-control.vjs-icon-forward_10 {
      width: $tiny-skip-size;
      height: $tiny-skip-size;

      &::before {
        font-size: $tiny-skip-size * 0.55;
        line-height: $tiny-skip-size;
      }
    }

    > .vjs-control.vjs-icon-replay_10 {
      right: calc(50% + #{$tiny-play-size * 0.6});
    }

    > .vjs-control.vjs-icon-forward_10 {
      left: calc(50% + #{$tiny-play-size * 0.6});
    }
  }

  /* !!rtl:end:ignore */

</style>
