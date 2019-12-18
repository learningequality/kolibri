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
      @submit="handleSubmitDelete"
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import find from 'lodash/find';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { mapState } from 'vuex';
  import { LessonResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import AssignmentCopyModal from '../../plan/assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../plan/assignments/AssignmentDeleteModal';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'ManageLessonModals',
    components: {
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      // Should be 'COPY' or 'DELETE'
      currentAction: {
        type: String,
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
          50
        );
        // Strip current lesson's adHocGroup ID from the list and map to expected format.
        const copySourceAdHocGroupId = this.$store.state.adHocLearners.id;
        let lesson_assignments = selectedCollectionIds
          .filter(id => id !== copySourceAdHocGroupId)
          .map(id => ({ collection: id }));

        const classroomName = find(this.classList, { id: selectedClassroomId }).name;

        // Create an adHocGroup for the lesson
        this.$store
          .dispatch('adHocLearners/createAdHocLearnersGroup', {
            classId: selectedClassroomId,
          })
          // Then update it's associated learners with what we got from the selector
          .then(() => {
            return this.$store.dispatch(
              'adHocLearners/updateLearnersInAdHocLearnersGroup',
              adHocLearnerIds
            );
          })
          .then(() => {
            // Include the newly created adHocGroup in assignments
            lesson_assignments.push({ collection: this.$store.state.adHocLearners.id });
            LessonResource.saveModel({
              data: {
                title,
                description: this.currentLesson.description,
                resources: this.currentLesson.resources,
                collection: selectedClassroomId,
                lesson_assignments,
              },
            })
              .then(() => {
                // If copied to the same classroom, update the class summary
                if (this.classId === selectedClassroomId) {
                  this.$store.dispatch('classSummary/refreshClassSummary');
                }
                this.closeModal();
                this.$store.dispatch(
                  'createSnackbar',
                  this.$tr('copiedLessonTo', { classroomName })
                );
              })
              .catch(error => {
                const caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
                if (caughtErrors) {
                  this.$store.commit('CORE_CREATE_SNACKBAR', {
                    text: this.$tr('uniqueTitleError', {
                      title,
                      className: classroomName,
                    }),
                    autoDismiss: false,
                    actionText: this.coreString('closeAction'),
                    actionCallback: () => this.$store.commit('CORE_CLEAR_SNACKBAR'),
                  });
                } else {
                  this.$store.dispatch('handleApiError', error);
                }
                this.closeModal();
              });
          });
      },
      handleSubmitDelete() {
        const { title, id } = this.currentLesson;
        return LessonResource.deleteModel({ id })
          .then(() => {
            this.$router.replace(this.$router.getRoute('PLAN_LESSONS_ROOT'), () => {
              this.$store.dispatch('createSnackbar', this.$tr('lessonDeleted', { title }));
            });
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
    },
    $trs: {
      copyLessonTitle: 'Copy lesson to',
      assignmentQuestion: 'Assign lesson to',
      deleteLessonTitle: 'Delete lesson',
      deleteLessonConfirmation: "Are you sure you want to delete '{ title }'?",
      copyOfLesson: 'Copy of { lessonTitle }',
      copiedLessonTo: `Copied lesson to '{classroomName}'`,
      uniqueTitleError: `A lesson titled '{title}' already exists in '{className}'`,
      lessonDeleted: `Lesson '{title}' was deleted`,
    },
  };

</script>


<style lang="scss" scoped></style>
