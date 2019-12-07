<template>

  <li class="vjs-menu-item">
    <KCheckbox
      ref="kCheckbox"
      :label="$tr('subtitles')"
      :checked="selected"
      role="menuitem"
      @change="toggleSubtitles"
      @keydown.space="toggleSubtitles"
      @keydown.enter="toggleSubtitles(), $emit('hide')"
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
      subtitles: 'Subtitles',
    },
  };

</script>


<style lang="scss" scoped></style>
