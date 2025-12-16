<template>

  <li
    class="vjs-menu-item"
    role="menuitem"
  >
    <KCheckbox
      ref="kCheckbox"
      :label="coreString('transcript')"
      :checked="selected"
      role="menuitem"
      @change="toggleTranscript"
      @keydown.space="toggleTranscript"
      @keydown.enter="(toggleTranscript(), $emit('hide'))"
    />
  </li>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'TranscriptMenuItem',
    mixins: [commonCoreStrings],
    computed: {
      ...mapState('mediaPlayer/captions', {
        selected: 'transcript',
      }),
    },
    methods: {
      ...mapActions('mediaPlayer/captions', ['toggleTranscript']),
      /**
       * @public
       */
      focus() {
        this.$nextTick(() => this.$refs.kCheckbox.focus());
      },
    },
  };

</script>


<style lang="scss" scoped></style>
