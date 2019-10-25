<template>

  <MediaPlayerMenu class="captions-menu">
    <li class="vjs-menu-item" role="menuitem">
      <KCheckbox
        :label="$tr('subtitles')"
        :checked="subtitles"
        role="menuitem"
        @change="toggleSubtitles"
      />
    </li>
    <li class="vjs-menu-item" role="menuitem">
      <KCheckbox
        :label="$tr('transcript')"
        :checked="transcript"
        role="menuitem"
        @change="toggleTranscript"
      />
    </li>
  </MediaPlayerMenu>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import MediaPlayerMenu from '../MediaPlayerMenu';
  import mediaPlayerMenuMixin from '../mixins/MediaPlayerMenu';

  export default {
    name: 'CaptionsMenu',
    components: { MediaPlayerMenu },
    mixins: [mediaPlayerMenuMixin],
    computed: {
      ...mapState('mediaPlayer/captions', ['subtitles', 'transcript']),
    },
    methods: {
      ...mapActions('mediaPlayer/captions', ['toggleSubtitles', 'toggleTranscript']),
    },
    $trs: {
      subtitles: 'Subtitles',
      transcript: 'Transcript',
    },
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

  /deep/ .k-checkbox-container {
    margin: 0;
  }

</style>
