<template>

  <MediaPlayerMenu ref="menu" class="languages-menu">
    <!-- Languages get added dynamically through video.js -->
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

  @import '~kolibri.styles.definitions';
  @import '../videojs-style/variables';

  /* for consistency, use `em` since video.js defines these that way */
  .vjs-menu {
    left: -8em;
    width: 16em;
    max-height: calc(#{$video-player-max-height} - #{$video-player-control-height});
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
