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
      :primary="true"
      @click="$emit('randomize')"
    />
  </preview-exam-modal>

</template>


<script>

  import * as ExamActions from '../../../state/actions/exam';
  import previewExamModal from '../exams-page/preview-exam-modal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'previewNewExamModal',
    $trs: { randomize: 'Randomize' },
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
    vuex: { actions: { setExamsModal: ExamActions.setExamsModal } },
  };

</script>


<style lang="stylus" scoped></style>
