<template>

  <div>
    <AssignmentCopyModal
      v-if="currentAction === AssignmentActions.COPY"
      :modalTitle="$tr('copyLessonTitle')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @submit="handleCopy"
      @cancel="closeModal"
    />

    <AssignmentDeleteModal
      v-if="currentAction === AssignmentActions.DELETE"
      :modalTitle="$tr('deleteLessonTitle')"
      :modalDescription="$tr('deleteLessonConfirmation', { title: currentLesson.title })"
      @submit="deleteLesson({ lessonId: currentLesson.id, classId })"
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import find from 'lodash/find';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { mapState, mapActions } from 'vuex';
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
    mixins: [coachStringsMixin],
    props: {
      currentAction: {
        type: String,
      },
    },
    computed: {
      ...mapState(['classList']),
      ...mapState('classSummary', { className: 'name' }),
      ...mapState('lessonSummary', ['currentLesson', 'lessonsModalSet', 'learnerGroups']),
      AssignmentActions() {
        return AssignmentActions;
      },
      classId() {
        return this.$route.params.classId;
      },
    },
    methods: {
      ...mapActions('lessonSummary', ['deleteLesson']),
      closeModal() {
        this.$emit('cancel');
      },
      handleCopy(selectedClassroomId, selectedCollectionIds) {
        const title = this.$tr('copyOfLesson', { lessonTitle: this.currentLesson.title }).substring(
          0,
          50
        );
        const payload = {
          title,
          description: this.currentLesson.description,
          resources: this.currentLesson.resources,
          collection: selectedClassroomId,
          lesson_assignments: selectedCollectionIds.map(id => ({ collection: id })),
        };
        const classroomName = find(this.classList, { id: selectedClassroomId }).name;
        this.$store
          .dispatch('lessonSummary/copyLesson', payload)
          .then(() => {
            // If copied to the same classroom, update the class summary
            if (this.classId === selectedClassroomId) {
              this.$store.dispatch('classSummary/refreshClassSummary');
            }
            this.closeModal();
            this.$store.dispatch('createSnackbar', this.$tr('copiedLessonTo', { classroomName }));
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
                actionText: this.coachStrings.$tr('closeAction'),
                actionCallback: () => this.$store.commit('CORE_CLEAR_SNACKBAR'),
              });
            } else {
              this.$store.dispatch('handleApiError', error);
            }
            this.closeModal();
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
    },
  };

</script>


<style lang="scss" scoped></style>
