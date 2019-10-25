<template>

  <MediaPlayerMenu class="languages-menu">
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
    left: -12em;
    width: 20em;
  }

  /deep/ .k-radio-button {
    margin: 0;
  }

</style>
