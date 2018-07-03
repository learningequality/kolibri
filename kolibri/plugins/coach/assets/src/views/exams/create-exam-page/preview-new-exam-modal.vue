<template>

  <preview-exam-modal
    :examQuestionSources="examQuestionSources"
    :examSeed="examSeed"
    :examNumQuestions="examNumQuestions"
    :examCreation="true"
  >
    <k-button
      slot="randomize-button"
      :text="$tr('randomize')"
      :primary="false"
      class="randomize-btn"
      @click="$emit('randomize')"
    />
  </preview-exam-modal>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import { setExamsModal } from '../../../state/actions/exam';
  import previewExamModal from '../exams-page/preview-exam-modal';

  export default {
    name: 'previewNewExamModal',
    $trs: { randomize: 'Randomize questions' },
    components: {
      previewExamModal,
      kButton,
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
    },
    methods: {
      close() {
        this.setExamsModal(false);
      },
    },
    vuex: { actions: { setExamsModal } },
  };

</script>


<style lang="stylus" scoped>

  .randomize-btn
    margin: 0 0 0 8px

</style>
