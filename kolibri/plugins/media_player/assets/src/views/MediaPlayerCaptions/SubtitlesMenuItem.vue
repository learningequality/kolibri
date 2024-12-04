<template>

  <li class="vjs-menu-item">
    <KCheckbox
      ref="kCheckbox"
      :label="$tr('subtitles')"
      :checked="selected"
      role="menuitem"
      @change="toggleSubtitles"
      @keydown.space="toggleSubtitles"
      @keydown.enter="(toggleSubtitles(), $emit('hide'))"
    />
  </li>

</template>


<script>

  import { mapState, mapActions } from 'vuex';

  export default {
    name: 'SubtitlesMenuItem',
    computed: {
      ...mapState('mediaPlayer/captions', {
        selected: 'subtitles',
      }),
    },
    methods: {
      ...mapActions('mediaPlayer/captions', ['toggleSubtitles']),
      /**
       * @public
       */
      focus() {
        this.$nextTick(() => this.$refs.kCheckbox.focus());
      },
    },
    $trs: {
      subtitles: {
        message: 'Subtitles',
        context:
          "The Kolibri media player allows learners to view audiovisual content with subtitles (captions) in different languages. These are accessed via the 'CC' option on the player.\n\nThey can also select a download of the media file containing the subtitles they want to view, where available.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
