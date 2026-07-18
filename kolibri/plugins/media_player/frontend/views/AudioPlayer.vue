<template>

  <div
    ref="rootEl"
    :class="{ 'standalone-wrapper': !embedded }"
  >
    <!-- Keyed on the source: video.js removes the element it wrapped when the
    player is disposed, so re-init needs a freshly mounted <audio> tag. Keying
    the tag itself does not work — video.js has moved it into its own wrapper,
    so Vue's replacement insert is a no-op. -->
    <div
      :key="defaultFile && defaultFile.storage_url"
      ref="wrapper"
      class="audio-card"
      :style="cardStyle"
    >
      <div
        v-show="loading"
        class="loading-container"
      >
        <KCircularLoader :delay="true" />
      </div>

      <!-- Audio element is always in DOM (hidden via CSS) so video.js can initialize it -->
      <audio
        ref="playerRef"
        class="audio-element"
      >
        <source
          v-for="audio in audioSources"
          :key="audio.storage_url"
          :src="audio.storage_url"
          :type="audioSourceType(audio.extension)"
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
      </audio>

      <template v-if="!loading">
        <img
          v-if="posterUrl"
          :src="posterUrl"
          class="audio-poster"
          alt=""
        >

        <!-- While the sticky player is showing, this card copy is scrolled
        off-screen. Mark it inert so its duplicate slider/buttons leave the tab
        order and the accessibility tree, leaving the sticky copy as the single
        set of controls. (`inert` is a known Vue 2 boolean attr: false removes
        it.) -->
        <AudioPlayerControls :inert="stickyPlayerVisible" />

        <div
          v-if="captionTracks.length > 0"
          class="transcript-toggle"
          :style="{ borderColor: $themeTokens.fineLine }"
        >
          <button
            class="transcript-toggle-button"
            :class="$computedClass(transcriptToggleHoverStyle)"
            :aria-pressed="transcriptVisible"
            @click="toggleTranscript"
          >
            <ClosedCaptionIcon class="transcript-toggle-icon" />
            {{
              transcriptVisible ? mediaStrings.hideTranscript$() : mediaStrings.showTranscript$()
            }}
          </button>
        </div>

        <MediaPlayerTranscript
          v-if="transcriptVisible"
          class="audio-transcript"
          :style="transcriptContainerStyle"
        />
      </template>
    </div>

    <AudioStickyPlayer v-if="stickyPlayerVisible" />
  </div>

</template>


<script>

  import vue, { computed, ref, onBeforeUnmount, getCurrentInstance } from 'vue';
  import ClosedCaptionIcon from 'kolibri-design-system/lib/KIcon/precompiled-icons/material-icons/closed_caption/baseline.vue';
  import useMediaPlayer, { PLAYBACK_RATES } from '../composables/useMediaPlayer';
  import mediaStrings from '../utils/mediaStrings';
  import MediaPlayerTranscript from './MediaPlayerTranscript';
  import AudioPlayerControls from './AudioPlayerControls';
  import AudioStickyPlayer from './AudioStickyPlayer';

  const GlobalLangCode = vue.locale;

  const audioExtensionToMimeType = {
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
  };

  export default {
    name: 'AudioPlayer',
    components: {
      AudioPlayerControls,
      AudioStickyPlayer,
      MediaPlayerTranscript,
      ClosedCaptionIcon,
    },
    setup(props, context) {
      const instance = getCurrentInstance().proxy;
      const rootEl = ref(null);
      const playerRef = ref(null);
      const wrapper = ref(null);

      // Sticky player state
      const isIntersecting = ref(true);
      let intersectionObserver = null;

      function setupIntersectionObserver() {
        if (typeof IntersectionObserver === 'undefined') {
          return;
        }
        // onReady runs on every player init, including re-init on source change
        if (intersectionObserver) {
          intersectionObserver.disconnect();
        }
        intersectionObserver = new IntersectionObserver(
          entries => {
            isIntersecting.value = entries[0].isIntersecting;
          },
          { threshold: 0.5 },
        );
        intersectionObserver.observe(rootEl.value);
      }

      // Initialize media player composable (provides context to child components,
      // handles progress tracking, settings, and player lifecycle)
      const {
        files,
        defaultFile,
        thumbnailFiles,
        embedded,
        captionTracks,
        transcript,
        toggleTranscript,
        trackSources,
        isDefaultTrack,
        loading,
        isPlaying,
      } = useMediaPlayer(context, {
        rootEl,
        wrapperRef: wrapper,
        playerRef,
        getPlayerConfig,
        onReady: setupIntersectionObserver,
      });

      // Computed
      const audioSources = computed(() => {
        return files.value.filter(file => file.preset === 'audio');
      });

      const posterUrl = computed(() => thumbnailFiles.value[0]?.storage_url ?? null);

      const transcriptVisible = computed(() => {
        return transcript.value && !loading.value && captionTracks.value.length > 0;
      });

      const stickyPlayerVisible = computed(() => {
        return isPlaying.value && !isIntersecting.value;
      });

      // Only theme-derived (dynamic) styles are inline; static layout lives in
      // the <style> block so RTLCSS can flip it.
      const cardStyle = computed(() => ({
        border: `1px solid ${instance.$themeTokens.fineLine}`,
        backgroundColor: instance.$themePalette.grey.v_100,
        color: instance.$themeTokens.annotation,
      }));
      // Only the theme-derived border is dynamic; max-height lives in the
      // <style> block (.audio-transcript).
      const transcriptContainerStyle = computed(() => ({
        borderTop: `1px solid ${instance.$themeTokens.fineLine}`,
      }));
      const transcriptToggleHoverStyle = computed(() => ({
        ':hover': {
          backgroundColor: instance.$themePalette.grey.v_200,
        },
      }));

      // Methods
      function audioSourceType(extension) {
        return audioExtensionToMimeType[extension] || `audio/${extension}`;
      }

      function getPlayerConfig() {
        return {
          controls: false,
          preload: 'metadata',
          playbackRates: PLAYBACK_RATES,
          language: GlobalLangCode,
          languages: {
            [GlobalLangCode]: {
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

      onBeforeUnmount(() => {
        if (intersectionObserver) {
          intersectionObserver.disconnect();
        }
      });

      return {
        rootEl,
        playerRef,
        wrapper,
        defaultFile,
        embedded,
        captionTracks,
        toggleTranscript,
        loading,
        audioSources,
        trackSources,
        posterUrl,
        transcriptVisible,
        stickyPlayerVisible,
        audioSourceType,
        isDefaultTrack,
        cardStyle,
        transcriptContainerStyle,
        transcriptToggleHoverStyle,
        mediaStrings,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .standalone-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }

  .audio-card {
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    overflow: hidden;
    border-radius: 4px;
  }

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .audio-element {
    // Use visibility/height approach so video.js can still access the element
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }

  .audio-poster {
    display: block;
    width: 100%;
    height: auto;
  }

  .transcript-toggle {
    display: flex;
    justify-content: center;
    padding: 8px;
    border-top: 1px solid;
  }

  .transcript-toggle-button {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    padding: 8px 16px;
    font-size: 0.85rem;
    font-weight: bold;
    color: inherit;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    background: none;
    border: 0;
    border-radius: 4px;

    &:focus {
      outline: 3px solid currentcolor;
      outline-offset: 4px;
    }
  }

  .transcript-toggle-icon {
    width: 20px;
    height: 20px;
  }

  .audio-transcript {
    max-height: 300px;
    overflow-y: auto;
  }

</style>
