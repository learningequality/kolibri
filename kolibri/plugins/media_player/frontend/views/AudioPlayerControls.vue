<template>

  <div
    :class="['audio-controls', `rows-${rows}`]"
    :style="{ '--focus-color': $themeTokens.focusOutline }"
  >
    <div class="transport-row">
      <button
        class="icon-button"
        :class="$computedClass(iconHoverStyle)"
        :aria-label="mediaStrings.replay$()"
        @click="rewind()"
      >
        <Replay10Icon />
      </button>
      <button
        class="play-button"
        :class="$computedClass(playButtonStyle)"
        :aria-label="isPlaying ? mediaStrings.pause$() : mediaStrings.play$()"
        @click="togglePlay"
      >
        <PauseIcon v-if="isPlaying" />
        <PlayArrowIcon v-else />
      </button>
      <button
        class="icon-button"
        :class="$computedClass(iconHoverStyle)"
        :aria-label="mediaStrings.forward$()"
        @click="forward()"
      >
        <Forward10Icon />
      </button>
    </div>

    <div class="progress-group">
      <div class="time-row">
        <span class="time-display">{{ formattedCurrentTime }}</span>
        <span class="time-display">{{ formattedDuration }}</span>
      </div>
      <div
        ref="progressBar"
        class="progress-bar-container"
        role="slider"
        :aria-label="mediaStrings.progressBar$()"
        :aria-valuemin="0"
        :aria-valuemax="Math.floor(duration) || 0"
        :aria-valuenow="Math.floor(currentTime) || 0"
        :aria-valuetext="formattedCurrentTime"
        tabindex="0"
        @mousedown="onProgressMouseDown"
        @touchstart.prevent="onProgressTouchStart"
        @keydown="onProgressKeyDown"
      >
        <!-- Fill/thumb are positioned from the left in all locales: a media
        timeline runs earlier-to-later left-to-right regardless of text
        direction, matching the seek math (clientX - rect.left) in useSeekBar. -->
        <div
          class="progress-bar-track"
          :style="{ backgroundColor: $themePalette.grey.v_300 }"
        >
          <div
            class="progress-bar-fill"
            :style="{ width: progressPercent + '%', backgroundColor: $themeTokens.primary }"
          ></div>
          <div
            class="progress-bar-thumb"
            :style="{ left: progressPercent + '%', backgroundColor: $themeTokens.primary }"
          ></div>
        </div>
      </div>
    </div>

    <button
      class="icon-button volume-button"
      :class="$computedClass(iconHoverStyle)"
      :aria-label="muted ? mediaStrings.unmute$() : mediaStrings.mute$()"
      @click="toggleMute"
    >
      <VolumeOffIcon v-if="muted" />
      <VolumeUpIcon v-else />
    </button>

    <button
      class="rate-button"
      :class="$computedClass(iconHoverStyle)"
      :aria-label="mediaStrings.playbackRateWithValue$({ rate: playbackRate })"
      @click="cyclePlaybackRate"
    >
      {{ playbackRateLabel }}
    </button>
  </div>

</template>


<script>

  import { ref, computed, getCurrentInstance } from 'vue';
  // Direct SVG imports rather than KIcon — these render inside custom-sized
  // circular buttons where KIcon's wrapper markup would conflict with sizing.
  import PlayArrowIcon from 'kolibri-design-system/lib/KIcon/precompiled-icons/material-icons/play_arrow/baseline.vue';
  import PauseIcon from 'kolibri-design-system/lib/KIcon/precompiled-icons/material-icons/pause/baseline.vue';
  import Replay10Icon from 'kolibri-design-system/lib/KIcon/precompiled-icons/material-icons/replay_10/baseline.vue';
  import Forward10Icon from 'kolibri-design-system/lib/KIcon/precompiled-icons/material-icons/forward_10/baseline.vue';
  import VolumeUpIcon from 'kolibri-design-system/lib/KIcon/precompiled-icons/material-icons/volume_up/baseline.vue';
  import VolumeOffIcon from 'kolibri-design-system/lib/KIcon/precompiled-icons/material-icons/volume_off/baseline.vue';
  import useSeekBar from '../composables/useSeekBar';
  import mediaStrings from '../utils/mediaStrings';

  export default {
    name: 'AudioPlayerControls',
    components: {
      PlayArrowIcon,
      PauseIcon,
      Replay10Icon,
      Forward10Icon,
      VolumeUpIcon,
      VolumeOffIcon,
    },
    setup() {
      const instance = getCurrentInstance().proxy;
      const progressBar = ref(null);

      const iconHoverStyle = computed(() => ({
        ':hover': {
          backgroundColor: instance.$themePalette.grey.v_200,
        },
      }));
      const playButtonStyle = computed(() => ({
        backgroundColor: instance.$themeTokens.primary,
        color: instance.$themeTokens.textInverted,
      }));

      return {
        progressBar,
        ...useSeekBar(progressBar),
        iconHoverStyle,
        playButtonStyle,
        mediaStrings,
      };
    },
    props: {
      rows: {
        type: Number,
        default: 3,
        validator: value => [1, 2, 3].includes(value),
      },
    },
  };

</script>


<style lang="scss" scoped>

  // Flexbox layout (not CSS grid, for wider browser support). The `rows` prop
  // selects the arrangement and button sizes.

  .audio-controls {
    display: flex;
    gap: 8px;
    align-items: center;
    // Media controls stay LTR in every locale, as on the video player and
    // YouTube; rtl:ignore stops RTLCSS flipping this back.

    /* rtl:ignore */
    direction: ltr;
  }

  // Transport row, then progress row, then volume (left) / rate (right).
  .rows-3 {
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 16px;

    .transport-row {
      flex-basis: 100%;
    }

    .progress-group {
      flex-basis: 100%;
    }

    .icon-button {
      width: 40px;
      height: 40px;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .play-button {
      width: 56px;
      height: 56px;

      svg {
        width: 32px;
        height: 32px;
      }
    }
  }

  // Progress row on top; volume (left) / transport (centre) / rate (right) below.
  .rows-2 {
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 8px;

    .progress-group {
      flex-basis: 100%;
    }

    .volume-button {
      order: 1;
    }

    .transport-row {
      order: 2;
    }

    .rate-button {
      order: 3;
    }

    .icon-button {
      width: 36px;
      height: 36px;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .play-button {
      width: 44px;
      height: 44px;

      svg {
        width: 26px;
        height: 26px;
      }
    }

    .time-display,
    .rate-button {
      font-size: 0.8rem;
    }

    .progress-bar-thumb {
      width: 12px;
      height: 12px;
    }
  }

  // Single row: volume | transport | progress | rate (visual order set via `order`).
  .rows-1 {
    padding: 8px;

    .volume-button {
      order: 1;
    }

    .transport-row {
      gap: 4px;
      order: 2;
    }

    .progress-group {
      flex: 1;
      order: 3;
      min-width: 0;
    }

    .rate-button {
      order: 4;
    }

    .icon-button {
      width: 32px;
      height: 32px;

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .play-button {
      width: 36px;
      height: 36px;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .time-display,
    .rate-button {
      font-size: 0.75rem;
    }

    .progress-bar-thumb {
      width: 10px;
      height: 10px;
    }
  }

  // ---- Group internals ----

  .transport-row {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: center;
  }

  .progress-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .time-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  // ---- Shared element styles ----

  .icon-button,
  .play-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    border: 0;
    border-radius: 50%;

    &:focus {
      outline: 3px solid var(--focus-color);
      outline-offset: 4px;
    }

    svg {
      fill: currentcolor;
    }
  }

  // .play-button takes its colours from inline theme styles; .icon-button
  // inherits text colour and stays transparent.
  .icon-button {
    color: inherit;
    background: none;
  }

  .time-display {
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .progress-bar-container {
    position: relative;
    height: 24px;
    cursor: pointer;

    &:focus {
      outline: none;

      .progress-bar-thumb {
        box-shadow: 0 0 0 3px var(--focus-color);
      }
    }
  }

  .progress-bar-track {
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 4px;
    border-radius: 2px;
    transform: translateY(-50%);
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 2px;
  }

  .progress-bar-thumb {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .rate-button {
    padding: 4px 8px;
    font-weight: bold;
    color: inherit;
    cursor: pointer;
    background: none;
    border: 0;
    border-radius: 4px;

    &:focus {
      outline: 3px solid var(--focus-color);
      outline-offset: 4px;
    }
  }

</style>
