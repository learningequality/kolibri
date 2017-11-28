<template>

  <core-modal :title="$tr('deleteExam')" @cancel="close">
    <p v-html="$trHtml('areYouSure', { examTitle })"></p>
    <div class="footer">
      <icon-button :text="$tr('cancel')" @click="close"/>
      <icon-button :text="$tr('delete')" :primary="true" @click="deleteExam(examId)"/>
    </div>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    $trNameSpace: 'deleteExamModal',
    $trs: {
      deleteExam: 'Delete exam',
      areYouSure:
        'Are you sure you want to delete <strong>{ examTitle }</strong>? You will lose all data for this exam.',
      cancel: 'Cancel',
      delete: 'Delete',
    },
    components: {
      coreModal,
      iconButton,
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
        deleteExam: examActions.deleteExam,
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

