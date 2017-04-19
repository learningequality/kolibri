<template>

  <preview-exam-modal :exam="exam">
    <icon-button slot="randomize-button" :text="$tr('randomize')" @click="$emit('randomize')"/>
  </preview-exam-modal>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'previewNewExamModal',
    $trs: {
      previewExam: 'Preview exam exercises',
      randomize: 'Randomize',
      questions: '{count, number, integer} {count, plural, one {question} other {questions}}'
    },
    components: {
      'preview-exam-modal': require('../exams-page/preview-exam-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      examTitle: {
        type: String,
        required: true,
      },
      channelId: {
        type: String,
        required: true,
      },
      examNumQuestions: {
        type: Number,
        required: true,
      },
      questionSources: {
        type: Array,
        required: true,
      },
      seed: {
        type: Number,
        required: true,
      }
    },
    computed: {
      exam() {
        return {
          questionCount: this.examNumQuestions,
          channelId: this.channelId,
          seed: this.seed,
          questionSources: this.questionSources,
        };
      }
    },
    methods: {
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal: ExamActions.displayExamModal,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
