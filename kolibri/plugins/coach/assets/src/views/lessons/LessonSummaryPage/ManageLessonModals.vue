<template>

  <div>
    <AssignmentChangeStatusModal
      v-if="lessonsModalSet === AssignmentActions.CHANGE_STATUS"
      :modalTitle="$tr('changeLessonStatusTitle')"
      :modalDescription="$tr('changeLessonStatusDescription')"
      :active="currentLesson.is_active"
      @changeStatus="handleChangeStatus"
      @cancel="setLessonsModal(null)"
    />

    <AssignmentDetailsModal
      v-else-if="lessonsModalSet === AssignmentActions.EDIT_DETAILS"
      :modalTitle="$tr('editLessonDetails')"
      :submitErrorMessage="$tr('saveLessonError')"
      :initialDescription="currentLesson.description"
      :showDescriptionField="true"
      :isInEditMode="true"
      :initialTitle="currentLesson.title"
      :initialSelectedCollectionIds="initialSelectedCollectionIds"
      :classId="classId"
      :groups="learnerGroups"
      @save="handleDetailsModalSave"
      @cancel="setLessonsModal(null)"
      ref="detailsModal"
    />

    <AssignmentCopyModal
      v-else-if="lessonsModalSet === AssignmentActions.COPY"
      :modalTitle="$tr('copyLessonTitle')"
      :copyExplanation="$tr('copyExplanation')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @copy="handleCopy"
      @cancel="setLessonsModal(null)"
    />

    <AssignmentDeleteModal
      v-else-if="lessonsModalSet === AssignmentActions.DELETE"
      :modalTitle="$tr('deleteLessonTitle')"
      :modalDescription="$tr('deleteLessonDescription', { title: currentLesson.title })"
      @delete="deleteLesson({ lessonId: currentLesson.id, classId })"
      @cancel="setLessonsModal(null)"
    />
  </div>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import AssignmentChangeStatusModal from '../../assignments/AssignmentChangeStatusModal';
  import AssignmentDetailsModal from '../../assignments/AssignmentDetailsModal';
  import AssignmentCopyModal from '../../assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../assignments/AssignmentDeleteModal';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';

  export default {
    name: 'ManageLessonModals',
    components: {
      AssignmentChangeStatusModal,
      AssignmentDetailsModal,
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    computed: {
      ...mapState(['classId', 'classList', 'className']),
      ...mapState('lessonSummary', ['currentLesson', 'lessonsModalSet', 'learnerGroups']),
      AssignmentActions() {
        return AssignmentActions;
      },
      initialSelectedCollectionIds() {
        return this.currentLesson.lesson_assignments.map(recipient => recipient.collection);
      },
    },
    methods: {
      ...mapActions('lessonSummary', [
        'setLessonsModal',
        'updateLessonStatus',
        'deleteLesson',
        'copyLesson',
        'updateLesson',
      ]),
      handleChangeStatus(isActive) {
        this.updateLessonStatus({ lessonId: this.currentLesson.id, isActive });
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
        this.copyLesson({ payload, classroomName: this.className });
      },
      handleDetailsModalSave(payload) {
        this.updateLesson({
          lessonId: this.currentLesson.id,
          payload: {
            ...payload,
            lesson_assignments: payload.assignments,
          },
        })
          .then()
          .catch(() => this.$refs.detailsModal.handleSubmitFailure());
      },
    },
    $trs: {
      changeLessonStatusTitle: 'Change lesson status',
      changeLessonStatusDescription: 'Learners can only see active lessons',
      copyLessonTitle: 'Copy lesson',
      copyExplanation: 'Copy this lesson to',
      assignmentQuestion: 'Assign lesson to',
      deleteLessonTitle: 'Delete lesson',
      deleteLessonDescription: "Delete '{ title }'?",
      editLessonDetails: 'Edit lesson details',
      newLesson: 'New lesson',
      saveLessonError: 'There was a problem saving this lesson',
      copyOfLesson: 'Copy of { lessonTitle }',
    },
  };

</script>


<style lang="scss" scoped></style>
