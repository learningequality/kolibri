<template>

  <preview-exam-modal
    :examChannelId="examChannelId"
    :examQuestionSources="examQuestionSources"
    :examSeed="examSeed"
    :examNumQuestions="examNumQuestions"
    :examCreation="true">
    <k-button slot="randomize-button" :text="$tr('randomize')" :primary="true" @click="$emit('randomize')" />
  </preview-exam-modal>

</template>


<script>

  import * as ExamActions from '../../state/actions/exam';
  import previewExamModal from '../exams-page/preview-exam-modal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'previewNewExamModal',
    $trs: { randomize: 'Randomize questions' },
    components: {
      previewExamModal,
      kButton,
    },
    props: {
      examChannelId: {
        type: String,
        required: true,
      },
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
        this.displayExamModal(false);
      },
    },
    vuex: { actions: { displayExamModal: ExamActions.displayExamModal } },
  };

</script>


<style lang="stylus" scoped></style>
