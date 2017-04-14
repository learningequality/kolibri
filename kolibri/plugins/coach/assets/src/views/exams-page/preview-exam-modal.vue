<template>

  <core-modal :title="`${examTitle} ${$tr('preview')}`" @cancel="close">
    <div>Exam Preview</div>
    <icon-button :text="$tr('close')" @click="close"/>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'previewExamModal',
    $trs: {
      preview: 'Preview',
      close: 'Close',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
    methods: {
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal: examActions.displayExamModal,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
