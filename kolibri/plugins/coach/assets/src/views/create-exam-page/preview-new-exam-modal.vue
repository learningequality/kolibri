<template>

  <core-modal :title="$tr('previewExam')" @cancel="close">
    <div>Exam Preview</div>
    <icon-button :text="$tr('randomize')"/>
  </core-modal>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'previewNewExamModal',
    $trs: {
      previewExam: 'Preview exam exercises',
      randomize: 'Randomize',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      examTitle: {
        type: String,
        required: true,
      },
      examNumQuestions: {
        type: Number,
        required: true,
      },
      exercisesSelected: {
        type: Array,
        required: true,
      },
    },
    methods: {
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: ExamActions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
