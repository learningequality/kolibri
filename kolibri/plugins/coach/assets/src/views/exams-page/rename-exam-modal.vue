<template>

  <core-modal :title="$tr('renameExam')" @cancel="close">
    <form @submit.prevent="renameExam(examId, newExamTitle)">
      <core-textbox
        :label="$tr('examName')"
        :aria-label="$tr('examName')"
        :autofocus="true"
        :required="true"
        v-model.trim="newExamTitle"/>
      <div class="footer">
        <icon-button :text="$tr('cancel')" type="button" @click="close"/>
        <icon-button :text="$tr('rename')" :primary="true" type="submit"/>
      </div>
    </form>
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
        newExamTitle: this.examTitle,
      };
    },
    methods: {
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal: examActions.displayExamModal,
        renameExam: examActions.renameExam,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: center
    button
      min-width: 45%

</style>
