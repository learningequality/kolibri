<template>

  <core-modal :title="$tr('renameExam')" @cancel="close">
    <core-textbox
      :label="$tr('examName')"
      :aria-label="$tr('examName')"
      v-model="inputExamName"
      :autofocus="true"
      :required="true"/>
    <icon-button :text="$tr('cancel')" @click="close"/>
    <icon-button :text="$tr('rename')" :primary="true" @click="renameExam"/>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'renameExamModal',
    $trs: {
      renameExam: 'Rename exam',
      examName: 'Exam name',
      cancel: 'Cancel',
      rename: 'Rename',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
    },
    props: {
      examId: {
        type: String,
        required: true,
      },
      examTitle: {
        type: String,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        inputExamName: this.examTitle,
      };
    },
    methods: {
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: examActions.displayModal,
        renameExam: examActions.renameExam,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
