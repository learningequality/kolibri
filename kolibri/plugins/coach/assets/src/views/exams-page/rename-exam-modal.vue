<template>

  <core-modal :title="$tr('renameExam')" @cancel="close">
    <form @submit.prevent="callRenameExam">
      <k-textbox
        ref="name"
        :label="$tr('examName')"
        :autofocus="true"
        :invalid="titleIsInvalid"
        :invalidText="titleIsInvalidText"
        @blur="titleBlurred = true"
        v-model.trim="newExamTitle"
      />
      <div class="footer">
        <k-button :text="$tr('cancel')" appearance="flat-button" type="button" @click="close" />
        <k-button :text="$tr('rename')" :primary="true" type="submit" :disabled="submitting" />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import { displayExamModal, renameExam } from '../../state/actions/exam';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  export default {
    name: 'renameExamModal',
    $trs: {
      renameExam: 'Rename exam',
      examName: 'Exam name',
      cancel: 'Cancel',
      rename: 'Rename',
      duplicateTitle: 'An exam with that title already exists',
      required: 'This field is required',
    },
    components: {
      coreModal,
      kButton,
      kTextbox,
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
      return {
        newExamTitle: this.examTitle,
        titleBlurred: false,
        formSubmitted: false,
        submitting: false,
      };
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
      titleIsInvalidText() {
        if (this.titleBlurred || this.formSubmitted) {
          if (this.newExamTitle === '') {
            return this.$tr('required');
          }
          if (this.duplicateTitle) {
            return this.$tr('duplicateTitle');
          }
        }
        return '';
      },
      titleIsInvalid() {
        return !!this.titleIsInvalidText;
      },
      formIsValid() {
        return !this.titleIsInvalid;
      },
    },
    methods: {
      callRenameExam() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.renameExam(this.examId, this.newExamTitle);
        } else {
          this.$refs.name.focus();
        }
      },
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal,
        renameExam,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: right

</style>
