<template>

  <core-modal :title="$tr('previewExam')" @cancel="close">
    <h2>{{ examTitle }}</h2>
    <div>
      {{$tr('questions', { count: examNumQuestions }) }}
      <icon-button :text="$tr('randomize')"/>
    </div>
    {{ selectedExercises }}
  </core-modal>

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
      selectedExercises: {
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
