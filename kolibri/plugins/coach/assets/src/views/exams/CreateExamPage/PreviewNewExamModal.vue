<template>

  <CreateExamPreview
    :examQuestionSources="examQuestionSources"
    :examSeed="examSeed"
    :examNumQuestions="examNumQuestions"
    :examCreation="true"
    :exerciseContentNodes="exerciseContentNodes"
    @close="$emit('close')"
  >
    <KButton
      slot="randomize-button"
      :text="$tr('randomize')"
      :primary="false"
      class="randomize-btn"
      @click="$emit('randomize')"
    />
  </CreateExamPreview>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import CreateExamPreview from './CreateExamPreview';

  export default {
    name: 'PreviewNewExamModal',
    $trs: { randomize: 'Randomize questions' },
    components: {
      CreateExamPreview,
      KButton,
    },
    props: {
      examQuestionSources: {
        type: Array,
        required: true,
      },
      examSeed: {
        type: Number,
        required: true,
      },
      examNumQuestions: {
        type: Number,
        required: true,
      },
      exerciseContentNodes: {
        type: Array,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .randomize-btn {
    margin: 0 0 0 8px;
  }

</style>
