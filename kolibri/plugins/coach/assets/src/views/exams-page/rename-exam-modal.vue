<template>

  <core-modal :title="$tr('renameExam')" @cancel="close">
    <form @submit.prevent="callRenameExam">
      <core-textbox
        :label="$tr('examName')"
        :aria-label="$tr('examName')"
        :autofocus="true"
        :required="true"
        :invalid="duplicateTitle"
        :error="$tr('duplicateTitle')"
        v-model.trim="newExamTitle"/>
      <div class="footer">
        <icon-button :text="$tr('cancel')" type="button" @click="close"/>
        <icon-button :text="$tr('rename')" :primary="true" type="submit"/>
      </div>
    </form>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import coreTextbox from 'kolibri.coreVue.components.textbox';
  export default {
    name: 'renameExamModal',
    $trs: {
      renameExam: 'Rename exam',
      examName: 'Exam name',
      cancel: 'Cancel',
      rename: 'Rename',
      duplicateTitle: 'An exam with that title already exists',
    },
    components: {
      coreModal,
      iconButton,
      coreTextbox,
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
      exams: {
        type: Array,
        required: true,
      },
    },
    data() {
      return { newExamTitle: this.examTitle };
    },
    computed: {
      duplicateTitle() {
        if (this.newExamTitle === this.examTitle) {
          return false;
        }
        const index = this.exams.findIndex(
          exam => exam.title.toUpperCase() === this.newExamTitle.toUpperCase()
        );
        if (index === -1) {
          return false;
        }
        return true;
      },
    },
    methods: {
      callRenameExam() {
        if (!this.duplicateTitle) {
          this.renameExam(this.examId, this.newExamTitle);
        }
      },
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
