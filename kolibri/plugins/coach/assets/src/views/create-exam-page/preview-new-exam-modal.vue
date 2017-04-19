<template>

  <preview-exam-modal
    :examChannelId="examChannelId"
    :examQuestionSources="examQuestionSources"
    :examSeed="examSeed"
    :examNumQuestions="examNumQuestions"
    :examCreation="true"
    @removeExercise="emitRemoval">
    <icon-button slot="randomize-button" :text="$tr('randomize')" @click="$emit('randomize')"/>
  </preview-exam-modal>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'previewNewExamModal',
    $trs: {
      randomize: 'Randomize',
    },
    components: {
      'preview-exam-modal': require('../exams-page/preview-exam-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
      emitRemoval(exercise) {
        this.$emit('removeExercise', exercise);
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
