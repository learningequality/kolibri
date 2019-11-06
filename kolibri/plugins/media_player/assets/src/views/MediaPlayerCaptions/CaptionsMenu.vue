<template>

  <MediaPlayerMenu class="captions-menu">
    <!-- Items get added dynamically through video.js -->
  </MediaPlayerMenu>

</template>


<script>

  import MediaPlayerMenu from '../MediaPlayerMenu';
  import mediaPlayerMenuMixin from '../mixins/MediaPlayerMenu';

  export default {
    name: 'CaptionsMenu',
    components: { MediaPlayerMenu },
    mixins: [mediaPlayerMenuMixin],
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import '../videojs-style/variables';

  /* for consistency, use `em` since video.js defines these that way */
  .vjs-menu {
    left: -5em;
    width: 15em;
  }

  .custom-skin .vjs-menu /deep/ ul {
    li + li {
      margin-top: 4px;
    }
  }

</style>
