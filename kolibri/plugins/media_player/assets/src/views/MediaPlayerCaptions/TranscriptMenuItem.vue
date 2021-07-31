<template>

  <li class="vjs-menu-item" role="menuitem">
    <KCheckbox
      ref="kCheckbox"
      :label="$tr('transcript')"
      :checked="selected"
      role="menuitem"
      @change="toggleTranscript"
      @keydown.space="toggleTranscript"
      @keydown.enter="toggleTranscript(), $emit('hide')"
    />
  </li>

</template>


<script>

  import { mapState, mapActions } from 'vuex';

  export default {
    name: 'TranscriptMenuItem',
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
    $trs: {
      transcript: {
        message: 'Transcript',
        context:
          'Refers to the option to present the captions (subtitles) of the video in the form of the interactive transcript.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
