<template>

  <div>
    <assignment-summary
      :kind="examKind"
      :title="exam.title"
      :active="exam.active"
      :recipients="exam.assignments"
      :groups="learnerGroups"
      @changeStatus="displayExamModal(LessonActions.CHANGE_STATUS)"
    >
      <k-dropdown-menu
        slot="optionsDropdown"
        :text="$tr('options')"
        :options="actionOptions"
        appearance="raised-button"
        @select="handleSelection"
      />
    </assignment-summary>

    <p v-if="takenBy > 0">{{ $tr('averageScore', { num: averageScore }) }}</p>

    <core-table v-if="!noExamData">
      <caption class="visuallyhidden">{{ $tr('examReport') }}</caption>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('name') }}</th>
          <th>{{ $tr('status') }}</th>
          <th>{{ $tr('score') }}</th>
          <th>{{ $tr('group') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr class="table-row" v-for="(examTaker, i) in examTakers" :key="i">
          <td class="core-table-icon-col">
            <content-icon :kind="USER" />
          </td>
          <td class="core-table-main-col">
            <k-router-link
              v-if="examTaker.progress !== undefined"
              :text="examTaker.name"
              :to="examDetailPageLink(examTaker.id)"
              class="table-name"
            />
            <span v-else class="table-name">
              {{ examTaker.name }}
            </span>
          </td>

          <td>
            <span v-if="(examTaker.progress === exam.question_count) || examTaker.closed">
              {{ $tr('completed') }}
            </span>
            <span v-else-if="examTaker.progress !== undefined">
              {{ $tr('remaining', { num: (exam.question_count - examTaker.progress) }) }}
            </span>
            <span v-else>
              {{ $tr('notstarted') }}
            </span>
          </td>

          <td>
            <span v-if="examTaker.score === undefined">–</span>
            <span v-else>
              {{ $tr('scorePercentage', { num: examTaker.score / exam.question_count }) }}
            </span>
          </td>

          <td>{{ examTaker.group.name || '–' }}</td>
        </tr>
      </tbody>
    </core-table>

    <p v-else>{{ $tr('noExamData') }}</p>

    <preview-exam-modal
      v-if="showPreviewExamModal"
      :examQuestionSources="exam.question_sources"
      :examSeed="exam.seed"
      :examNumQuestions="exam.question_count"
    />

    <assignment-change-status-modal
      v-if="examModalShown === LessonActions.CHANGE_STATUS"
      :title="$tr('changeExamStatusTitle')"
      :description="$tr('changeExamStatusDescription')"
      :active="exam.active"
      @changeStatus="handleChangeStatus"
      @cancel="displayExamModal(null)"
    />

    <assignment-delete-modal
      v-if="examModalShown === LessonActions.DELETE"
      :title="$tr('deleteExamTitle')"
      :description="$tr('deleteExamDescription', { title: exam.title })"
      @delete="deleteExam(exam.id)"
      @cancel="displayExamModal(null)"
    />

  </div>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { PageNames } from '../../../constants';
  import sumBy from 'lodash/sumBy';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import { USER, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import { Modals as ExamModals } from '../../../examConstants';
  import previewExamModal from '../exams-page/preview-exam-modal';
  import deleteExamModal from '../exams-page/delete-exam-modal';
  import {
    displayExamModal,
    activateExam,
    deactivateExam,
    deleteExam,
  } from '../../../state/actions/exam';
  import AssignmentSummary from '../../assignments/AssignmentSummary';
  import AssignmentChangeStatusModal from '../../assignments/AssignmentChangeStatusModal';
  import AssignmentDeleteModal from '../../assignments/AssignmentDeleteModal';

  import { LessonActions } from '../../../lessonsConstants';

  export default {
    name: 'examReportPage',
    components: {
      contentIcon,
      CoreTable,
      kRouterLink,
      kDropdownMenu,
      previewExamModal,
      deleteExamModal,
      AssignmentSummary,
      AssignmentChangeStatusModal,
      AssignmentDeleteModal,
    },
    computed: {
      LessonActions() {
        return LessonActions;
      },
      noExamData() {
        return this.examTakers.length === 0;
      },
      USER() {
        return USER;
      },
      examKind() {
        return ContentNodeKinds.EXAM;
      },
      averageScore() {
        const totalScores = sumBy(this.examsInProgress, 'score');
        return totalScores / this.takenBy / this.exam.question_count;
      },
      examsInProgress() {
        return this.examTakers.filter(examTaker => examTaker.progress !== undefined);
      },
      takenBy() {
        return this.examsInProgress.length;
      },
      actionOptions() {
        return [
          { label: this.$tr('previewExam') },
          { label: this.$tr('editDetails') },
          { label: this.$tr('copyTo') },
          { label: this.$tr('delete') },
        ];
      },
      showPreviewExamModal() {
        return this.examModalShown === ExamModals.PREVIEW_EXAM;
      },
      showDeleteExamModal() {
        return this.examModalShown === ExamModals.DELETE_EXAM;
      },
    },
    methods: {
      handleSelection(optionSelected) {
        const action = optionSelected.label;
        if (action === this.$tr('previewExam')) {
          this.displayExamModal(ExamModals.PREVIEW_EXAM);
        } else if (action === this.$tr('editDetails')) {
          this.displayExamModal(ExamModals.EDIT_EXAM_DETAILS);
        } else if (action === this.$tr('copyTo')) {
          this.displayExamModal(ExamModals.COPY_EXAM);
        } else if (action === this.$tr('delete')) {
          this.displayExamModal(LessonActions.DELETE);
        }
      },
      examDetailPageLink(id) {
        return {
          name: PageNames.EXAM_REPORT_DETAIL_ROOT,
          params: {
            classId: this.classId,
            examId: this.exam.id,
            userId: id,
          },
        };
      },
      handleChangeStatus(isActive) {
        if (isActive === true) {
          this.activateExam(this.exam.id);
        } else if (isActive === false) {
          this.deactivateExam(this.exam.id);
        }
      },
    },
    vuex: {
      getters: {
        examTakers: state => state.pageState.examTakers,
        classId: state => state.classId,
        exam: state => state.pageState.exam,
        examModalShown: state => state.pageState.examModalShown,
        learnerGroups: state => state.pageState.learnerGroups,
      },
      actions: {
        displayExamModal,
        activateExam,
        deactivateExam,
        deleteExam,
      },
    },
    $trs: {
      averageScore: 'Average score: {num, number, percent}',
      examReport: 'Exam report',
      completed: 'Completed',
      remaining: '{ num, number } {num, plural, one {question} other {questions}} remaining',
      notstarted: 'Not started',
      name: 'Name',
      status: 'Status',
      score: 'Score',
      scorePercentage: '{num, number, percent}',
      group: 'Group',
      noExamData: 'No data to show.',
      options: 'Options',
      previewExam: 'Preview exam',
      editDetails: 'Edit details',
      copyTo: 'Copy to',
      delete: 'Delete',
      changeExamStatusTitle: 'Change exam status',
      changeExamStatusDescription: 'Learners can only see active exams',
      deleteExamTitle: 'Delete exam',
      deleteExamDescription: "Are you sure you want to delete '{ title }'?",
    },
  };

</script>


<style lang="stylus" scoped></style>
