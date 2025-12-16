<template>

  <div>
    <AssignmentCopyModal
      v-if="currentAction === AssignmentActions.COPY"
      :modalTitle="$tr('copyLessonTitle')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @submit="handleSubmitCopy"
      @cancel="closeModal"
    />

    <AssignmentDeleteModal
      v-if="currentAction === AssignmentActions.DELETE"
      :modalTitle="$tr('deleteLessonTitle')"
      :modalDescription="$tr('deleteLessonConfirmation', { title: currentLesson.title })"
      :cannotUndoActionWarning="coreString('cannotUndoActionWarning')"
      @submit="handleSubmitDelete"
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import find from 'lodash/find';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import { mapState } from 'vuex';
  import LessonResource from 'kolibri-common/apiResources/LessonResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import AssignmentCopyModal from '../../common/assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../common/assignments/AssignmentDeleteModal';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'ManageLessonModals',
    components: {
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    setup() {
      const { createSnackbar, clearSnackbar } = useSnackbar();
      return { createSnackbar, clearSnackbar };
    },
    props: {
      // Should be 'COPY' or 'DELETE'
      currentAction: {
        type: String,
        required: true,
        validator: function (value) {
          return ['', 'COPY', 'DELETE'].includes(value.toUpperCase());
        },
      },
    },
    computed: {
      ...mapState(['classList']),
      ...mapState('lessonSummary', ['currentLesson']),
      AssignmentActions() {
        return AssignmentActions;
      },
      classId() {
        return this.$route.params.classId;
      },
    },
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
      handleSubmitCopy(selectedClassroomId, selectedCollectionIds, adHocLearnerIds) {
        const title = this.$tr('copyOfLesson', { lessonTitle: this.currentLesson.title }).substring(
          0,
          50,
        );
        const classroomName = find(this.classList, { id: selectedClassroomId }).name;

        LessonResource.saveModel({
          data: {
            title,
            description: this.currentLesson.description,
            resources: this.currentLesson.resources,
            collection: selectedClassroomId,
            assignments: selectedCollectionIds,
            learner_ids: adHocLearnerIds,
          },
        })
          .then(() => {
            // If copied to the same classroom, update the class summary
            if (this.classId === selectedClassroomId) {
              this.$store.dispatch('classSummary/refreshClassSummary');
            }
            this.closeModal();
            this.showSnackbarNotification('lessonCopied');
          })
          .catch(error => {
            const caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (caughtErrors) {
              this.createSnackbar({
                text: this.$tr('uniqueTitleError', {
                  title,
                  className: classroomName,
                }),
                autoDismiss: false,
                actionText: this.coreString('closeAction'),
                actionCallback: () => this.clearSnackbar(),
              });
            } else {
              this.$store.dispatch('handleApiError', { error });
            }
            this.closeModal();
          });
      },
      handleSubmitDelete() {
        const { id } = this.currentLesson;
        return LessonResource.deleteModel({ id })
          .then(() => {
            this.$router.replace(
              this.$router.getRoute('LESSONS_ROOT', { classId: this.classId }),
              () => {
                this.showSnackbarNotification('lessonDeleted');
              },
            );
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
    },
    $trs: {
      copyLessonTitle: {
        message: 'Copy lesson to',
        context:
          "Coaches can copy a quiz to a different group, another class or individual learners.\n\nThis is the title of window that displays when user uses the 'Copy lesson' function from the 'Lessons' > 'Options' menu.",
      },
      assignmentQuestion: {
        message: 'Assign lesson to',
        context: "Text which appears on the 'Copy lesson' modal.",
      },
      deleteLessonTitle: {
        message: 'Delete lesson',
        context:
          "Title of the confirmation window that displays when user uses the 'Delete' option from the 'Lessons' > 'Options' menu.",
      },
      deleteLessonConfirmation: {
        message: "Are you sure you want to delete '{ title }'?",
        context:
          "Description of the confirmation window that displays when user uses the 'Delete' option from the 'Lessons' > 'Options' menu.\n",
      },
      copyOfLesson: {
        message: 'Copy of { lessonTitle }',
        context:
          "If a lesson is copied to another group in the same class, it will appear in the 'Lessons' tab as the 'Copy of (original name of lesson)'.\n",
      },
      uniqueTitleError: {
        message: `A lesson titled '{title}' already exists in '{className}'`,
        context:
          'Error message that displays when a user tries to give a name to a lesson that already exists.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
