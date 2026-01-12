<template>

  <Fullscreen
    ref="core"
    @changeFullscreen="handleChangeFullscreen"
  >
    <slot></slot>
  </Fullscreen>

</template>


<script>

  import Fullscreen from 'kolibri/components/Fullscreen';
  import { injectMediaPlayer } from '../../composables/useMediaPlayer';

  export default {
    name: 'MediaPlayerFullscreen',
    components: { Fullscreen },
    setup() {
      const { player } = injectMediaPlayer();

      return {
        player,
      };
    },
    data: () => ({
      // The handler wired to the current player's toggle. Re-init (VideoPlayer
      // re-creates the player on a source change) swaps in a new player, so we
      // detach the previous handler before wiring the new toggle. The videojs
      // listener lives on the old toggle and dies with the disposed player.
      onChangeFullscreen: null,
    }),
    watch: {
      player(player) {
        if (this.onChangeFullscreen) {
          this.$off('changeFullscreen', this.onChangeFullscreen);
          this.onChangeFullscreen = null;
        }
        if (!player) {
          return;
        }
        const toggle = player.getChild('ControlBar').getChild('MimicFullscreenToggle');

        if (!toggle) {
          return;
        }

        toggle.on('changeFullscreen', () => this.$refs.core.toggleFullscreen());
        this.onChangeFullscreen = isFullscreen => toggle.handleChangeFullscreen(isFullscreen);
        this.$on('changeFullscreen', this.onChangeFullscreen);
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
