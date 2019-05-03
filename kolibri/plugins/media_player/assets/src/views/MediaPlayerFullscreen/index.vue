<template>

  <CoreFullscreen ref="core" @changeFullscreen="handleChangeFullscreen">
    <slot></slot>
  </CoreFullscreen>

</template>


<script>

  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';

  export default {
    name: 'MediaPlayerFullscreen',

    components: { CoreFullscreen },

    data: () => ({}),

    methods: {
      /**
       * @public
       */
      setPlayer(player) {
        const toggle = player.getChild('ControlBar').getChild('MimicFullscreenToggle');

        if (!toggle) {
          return;
        }

        toggle.on('changeFullscreen', () => this.$refs.core.toggleFullscreen());
        this.$on('changeFullscreen', isFullscreen => toggle.handleChangeFullscreen(isFullscreen));
      },

      handleChangeFullscreen(isFullscreen) {
        this.$emit('changeFullscreen', isFullscreen);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '../../../../../../../node_modules/kolibri.styles.definitions';

</style>
