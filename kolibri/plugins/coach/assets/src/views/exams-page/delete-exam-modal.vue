<template>

  <core-modal :title="$tr('deleteExam')" @cancel="close">
    <p>{{ $tr('areYouSure', { examTitle }) }}</p>
    <div class="footer">
      <k-button :text="$tr('cancel')" appearance="flat-button" @click="close" />
      <k-button :text="$tr('delete')" :primary="true" @click="deleteExam(examId)" />
    </div>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'deleteExamModal',
    $trs: {
      deleteExam: 'Delete exam',
      areYouSure:
        "Are you sure you want to delete '{ examTitle }'? You will lose all data for this exam.",
      cancel: 'Cancel',
      delete: 'Delete',
    },
    components: {
      coreModal,
      kButton,
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
    text-align: right

</style>

