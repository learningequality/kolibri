<template>

  <div>
    <AssignmentCopyModal
      v-if="lessonsModalSet === AssignmentActions.COPY"
      :modalTitle="$tr('copyLessonTitle')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @submit="handleCopy"
      @cancel="closeModal"
    />

    <AssignmentDeleteModal
      v-if="lessonsModalSet === AssignmentActions.DELETE"
      :modalTitle="$tr('deleteLessonTitle')"
      :modalDescription="$tr('deleteLessonConfirmation', { title: currentLesson.title })"
      @submit="deleteLesson({ lessonId: currentLesson.id, classId })"
      @cancel="closeModal"
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
    computed: {
      ...mapState(['classList']),
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonSummary', ['currentLesson', 'lessonsModalSet', 'learnerGroups']),
      AssignmentActions() {
        return AssignmentActions;
      },
    },
    methods: {
      ...mapActions('lessonSummary', ['deleteLesson', 'copyLesson']),
      closeModal() {
        this.$store.commit('lessonSummary/SET_LESSONS_MODAL', '');
      },
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
        this.copyLesson({ payload, classroomName });
      },
    },
    $trs: {
      copyLessonTitle: 'Copy lesson to',
      assignmentQuestion: 'Assign lesson to',
      deleteLessonTitle: 'Delete lesson',
      deleteLessonConfirmation: "Are you sure you want to delete '{ title }'?",
      copyOfLesson: 'Copy of { lessonTitle }',
    },
  };

</script>


<style lang="scss" scoped></style>
