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

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { injectMediaPlayer } from '../composables/useMediaPlayer';
  import AudioPlayerControls from './AudioPlayerControls';

  export default {
    name: 'AudioStickyPlayer',
    components: {
      AudioPlayerControls,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const { containerRect } = injectMediaPlayer();

      return {
        windowIsSmall,
        containerRect,
      };
    },
    computed: {
      containerStyle() {
        const rect = this.containerRect;
        const style = {
          backgroundColor: this.$themeTokens.surface,
          borderColor: this.$themeTokens.fineLine,
        };
        if (this.windowIsSmall) {
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
      },
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
