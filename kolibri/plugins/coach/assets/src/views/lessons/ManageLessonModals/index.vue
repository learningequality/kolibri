<template>

  <div>
    <assignment-change-status-modal
      v-if="lessonsModalSet === AssignmentActions.CHANGE_STATUS"
      :modalTitle="$tr('changeLessonStatusTitle')"
      :modalDescription="$tr('changeLessonStatusDescription')"
      :active="currentLesson.is_active"
      @changeStatus="handleChangeStatus"
      @cancel="setLessonsModal(null)"
    />

    <assignment-details-modal
      v-else-if="lessonsModalSet === AssignmentActions.EDIT_DETAILS"
      :modalTitle="$tr('editLessonDetails')"
      :submitErrorMessage="$tr('saveLessonError')"
      :showDescriptionField="false"
      :isInEditMode="true"
      :initialTitle="exam.title"
      :initialSelectedCollectionIds="selectedCollectionIds"
      :classId="classId"
      :groups="learnerGroups"
      @save="updateExamDetails"
      @cancel="setLessonsModal(null)"
    />

    <assignment-copy-modal
      v-else-if="lessonsModalSet === AssignmentActions.COPY"
      :modalTitle="$tr('copyLessonTitle')"
      :copyExplanation="$tr('copyExplanation')"
      :assignmentQuestion="$tr('assignmentQuestion')"
      :classId="classId"
      :classList="classList"
      @copy="copyExam"
      @cancel="setLessonsModal(null)"
    />

    <assignment-delete-modal
      v-else-if="lessonsModalSet === AssignmentActions.DELETE"
      :modalTitle="$tr('deleteLessonTitle')"
      :modalDescription="$tr('deleteLessonDescription', { title: exam.title })"
      @delete="deleteExam(exam.id)"
      @cancel="setLessonsModal(null)"
    />
  </div>

</template>


<script>

  import AssignmentChangeStatusModal from '../../assignments/AssignmentChangeStatusModal';
  import AssignmentDetailsModal from '../../assignments/AssignmentDetailsModal';
  import AssignmentCopyModal from '../../assignments/AssignmentCopyModal';
  import AssignmentDeleteModal from '../../assignments/AssignmentDeleteModal';
  import { AssignmentActions } from '../../../assignmentsConstants';
  import { setLessonsModal, updateLessonStatus } from '../../../state/actions/lessons';

  export default {
    name: 'manageLessonModals',
    components: {
      AssignmentChangeStatusModal,
      AssignmentDetailsModal,
      AssignmentCopyModal,
      AssignmentDeleteModal,
    },
    computed: {
      AssignmentActions() {
        return AssignmentActions;
      },
    },
    methods: {
      handleChangeStatus(isActive) {
        this.updateLessonStatus(this.currentLesson.id, isActive);
      },
    },
    vuex: {
      getters: {
        currentLesson: state => state.pageState.currentLesson,
        lessonsModalSet: state => state.pageState.lessonsModalSet,
      },
      actions: {
        setLessonsModal,
        updateLessonStatus,
      },
    },
    $trs: {
      changeLessonStatusTitle: 'Change lesson status',
      changeLessonStatusDescription: 'Learners can only see active lessons',
      copyLessonTitle: 'Copy lesson',
      copyExplanation: 'Copy this lesson to',
      assignmentQuestion: 'Who should this lesson be assigned to?',
      deleteLessonTitle: 'Delete title',
      deleteLessonDescription: "Are you sure you want to delete '{ title }'?",
      editLessonDetails: 'Edit lesson details',
      newLesson: 'New lesson',
      saveLessonError: 'There was a problem saving this lesson',
    },
  };

</script>


<style lang="stylus" scoped></style>
