<template>

  <CoreFullscreen
    ref="core"
    @changeFullscreen="handleChangeFullscreen"
  >
    <slot></slot>
  </CoreFullscreen>

</template>


<script>

  import CoreFullscreen from 'kolibri-common/components/CoreFullscreen';
  import { injectMediaPlayer } from '../../composables/useMediaPlayer';

  export default {
    name: 'MediaPlayerFullscreen',
    components: { CoreFullscreen },
    setup() {
      const { player } = injectMediaPlayer();

      return {
        player,
      };
    },
    data: () => ({
      registered: false,
    }),
    watch: {
      player(player) {
        if (!player || this.registered) {
          return;
        }
        const toggle = player.getChild('ControlBar').getChild('MimicFullscreenToggle');

        if (!toggle) {
          return;
        }

        toggle.on('changeFullscreen', () => this.$refs.core.toggleFullscreen());
        this.$on('changeFullscreen', isFullscreen => toggle.handleChangeFullscreen(isFullscreen));
        this.registered = true;
      },
    },
    methods: {
      handleChangeFullscreen(isFullscreen) {
        this.$emit('changeFullscreen', isFullscreen);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

</style>
