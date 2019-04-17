<template>

  <div>
    <AssignmentCopyModal
      v-if="currentAction === AssignmentActions.COPY"
      :modalTitle="$tr('copyLessonTitle')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @submit="handleCopy"
      @cancel="$emit('cancel')"
    />

    <AssignmentDeleteModal
      v-if="currentAction === AssignmentActions.DELETE"
      :modalTitle="$tr('deleteLessonTitle')"
      :modalDescription="$tr('deleteLessonConfirmation', { title: currentLesson.title })"
      @submit="deleteLesson({ lessonId: currentLesson.id, classId })"
      @cancel="$emit('cancel')"
    />
  </div>

</template>


<script>

  import find from 'lodash/find';
  import { mapState, mapActions } from 'vuex';
  import AssignmentCopyModal from '../../plan/assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../plan/assignments/AssignmentDeleteModal';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';

  export default {
    name: 'ManageLessonModals',
    components: {
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
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
      handleCopy(selectedClassroomId, selectedCollectionIds) {
        const payload = {
          title: this.$tr('copyOfLesson', { lessonTitle: this.currentLesson.title }).substring(
            0,
            50
          ),
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
            this.$emit('cancel');
            this.$store.dispatch('createSnackbar', this.$tr('copiedLessonTo', { classroomName }));
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
    },
  };

</script>


<style lang="scss" scoped></style>
