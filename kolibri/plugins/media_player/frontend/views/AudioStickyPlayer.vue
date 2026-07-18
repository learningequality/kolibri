<template>

  <div
    class="sticky-player"
    :class="{ 'sticky-top': !windowIsSmall, 'sticky-bottom': windowIsSmall }"
    :style="containerStyle"
  >
    <AudioPlayerControls :rows="windowIsSmall ? 2 : 1" />
  </div>

</template>


<script>

  import { computed, getCurrentInstance } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { injectMediaPlayer } from '../composables/useMediaPlayer';
  import AudioPlayerControls from './AudioPlayerControls';

  export default {
    name: 'AudioStickyPlayer',
    components: {
      AudioPlayerControls,
    },
    setup() {
      const instance = getCurrentInstance().proxy;
      const { windowIsSmall } = useKResponsiveWindow();
      const { containerRect } = injectMediaPlayer();

      // containerRect comes from useScrollContainer, which recomputes on
      // mount/resize/ResizeObserver but NOT on scroll. This is correct because
      // the player renders inside the learn layout's inner scroll pane, whose
      // viewport rect is fixed while its content scrolls; the fixed bar stays
      // put. If this is ever mounted where the scroll container itself moves in
      // the viewport, containerRect would need a scroll listener too.
      // left/top are physical overlay coordinates from getBoundingClientRect,
      // so they are intentionally not RTL-flipped.
      const containerStyle = computed(() => {
        const rect = containerRect.value;
        const style = {
          backgroundColor: instance.$themeTokens.surface,
          borderColor: instance.$themeTokens.fineLine,
        };
        if (windowIsSmall.value) {
          // Mobile: full-width bar anchored to the bottom of the scroll container
          const bottomOffset = window.innerHeight - rect.bottom;
          style.bottom = bottomOffset + 'px';
          style.left = rect.left + 'px';
          style.width = rect.width + 'px';
        } else {
          // Desktop: floating card anchored to the top of the scroll container
          const maxWidth = 640;
          const playerWidth = Math.min(maxWidth, rect.width);
          const centerOffset = rect.left + (rect.width - playerWidth) / 2;
          style.top = rect.top + 8 + 'px';
          style.left = centerOffset + 'px';
          style.width = playerWidth + 'px';
        }
        return style;
      });

      return {
        windowIsSmall,
        containerStyle,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .sticky-player {
    position: fixed;
    z-index: 10;
    box-sizing: border-box;
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .sticky-top {
    border-bottom: 1px solid;
  }

  .sticky-bottom {
    border-radius: 0;
  }

</style>
