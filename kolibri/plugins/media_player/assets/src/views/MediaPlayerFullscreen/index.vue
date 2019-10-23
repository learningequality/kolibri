<template>

  <CoreFullscreen ref="core" @changeFullscreen="handleChangeFullscreen">
    <slot></slot>
  </CoreFullscreen>

</template>


<script>

  import { mapState } from 'vuex';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';

  export default {
    name: 'MediaPlayerFullscreen',
    components: { CoreFullscreen },
    data: () => ({
      registered: false,
    }),
    computed: {
      ...mapState('mediaPlayer', ['player']),
    },
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
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
