<template>

  <CoreFullscreen ref="core" @changeFullscreen="handleChangeFullscreen">
    <slot></slot>
  </CoreFullscreen>

</template>


<script>

  import videojs from 'video.js';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';

  const Button = videojs.getComponent('Button');
  const FullscreenToggle = videojs.getComponent('FullscreenToggle');

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

  export class MimicFullscreenToggle extends FullscreenToggle {
    constructor(player, options) {
      super(player, options);

      this.handleChangeFullscreen(false);
    }

    buildCSSClass() {
      return `vjs-mimic-fullscreen-control ${Button.prototype.buildCSSClass.call(this)}`;
    }

    handleClick() {
      this.trigger('changeFullscreen');
    }

    handleChangeFullscreen(isFullscreen) {
      let el = this.$('.vjs-icon-placeholder'),
        addClass = MimicFullscreenToggle.INACTIVE_CLASS,
        removeClass = MimicFullscreenToggle.ACTIVE_CLASS,
        controlText = 'Fullscreen';

      if (isFullscreen) {
        addClass = MimicFullscreenToggle.ACTIVE_CLASS;
        removeClass = MimicFullscreenToggle.INACTIVE_CLASS;
        controlText = 'Non-Fullscreen';
      }

      videojs.dom.addClass(el, addClass);
      videojs.dom.removeClass(el, removeClass);
      this.controlText(controlText);
    }
  }

  MimicFullscreenToggle.ACTIVE_CLASS = 'vjs-icon-fullscreen-exit';
  MimicFullscreenToggle.INACTIVE_CLASS = 'vjs-icon-fullscreen-enter';

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
