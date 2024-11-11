<template>

  <MediaPlayerMenu
    ref="menu"
    class="languages-menu"
  >
    <!-- Languages get added dynamically through video.js -->
    <KRadioButtonGroup>
      <slot></slot>
    </KRadioButtonGroup>
  </MediaPlayerMenu>

</template>


<script>

  import MediaPlayerMenu from '../MediaPlayerMenu';
  import mediaPlayerMenuMixin from '../mixins/MediaPlayerMenu';

  export default {
    name: 'LanguagesMenu',
    components: { MediaPlayerMenu },
    mixins: [mediaPlayerMenuMixin],
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../videojs-style/variables';

  /* for consistency, use `em` since video.js defines these that way */
  .vjs-menu {
    left: -8em;
    width: 16em;
    // minus 32px max immersive layout padding
    max-height: calc(#{$video-player-height-vw} - #{$video-player-control-height} - 32px);
    overflow-y: auto;
  }

  /deep/ .k-radio-button {
    padding: 8px 0;
    margin: 0;

    .checked,
    .unchecked {
      top: 8px;
    }
  }

</style>
