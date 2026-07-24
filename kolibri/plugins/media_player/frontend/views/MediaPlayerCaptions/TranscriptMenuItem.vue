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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { injectMediaPlayer } from '../../composables/useMediaPlayer';

  export default {
    name: 'TranscriptMenuItem',
    mixins: [commonCoreStrings],
    setup() {
      const { transcript, toggleTranscript } = injectMediaPlayer();

      return {
        selected: transcript,
        toggleTranscript,
      };
    },
    methods: {
      /**
       * Accessible via parent component refs.
       * @public
       */
      focus() {
        this.$nextTick(() => this.$refs.kCheckbox.focus());
      },
    },
  };

</script>


<style lang="scss" scoped></style>
