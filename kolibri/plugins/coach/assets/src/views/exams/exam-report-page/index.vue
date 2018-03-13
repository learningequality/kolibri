<template>

  <div>
    <assignment-summary
      :kind="examKind"
      :title="exam.title"
      :active="exam.active"
      :recipients="exam.assignments"
      :groups="learnerGroups"
      @changeStatus="setExamsModal(AssignmentActions.CHANGE_STATUS)"
    >
      <k-dropdown-menu
        slot="optionsDropdown"
        :text="$tr('options')"
        :options="actionOptions"
        appearance="raised-button"
        @select="handleSelection"
      />
    </assignment-summary>

    <h2>{{ $tr('examReport') }}</h2>
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

    <manage-exam-modals />

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
  import { setExamsModal } from '../../../state/actions/exam';
  import { Modals as ExamModals } from '../../../examConstants';
  import { AssignmentActions } from '../../../assignmentsConstants';
  import AssignmentSummary from '../../assignments/AssignmentSummary';
  import ManageExamModals from './ManageExamModals';

  export default {
    name: 'examReportPage',
    components: {
      contentIcon,
      CoreTable,
      kRouterLink,
      kDropdownMenu,
      AssignmentSummary,
      ManageExamModals,
    },
    computed: {
      AssignmentActions() {
        return AssignmentActions;
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
    },
    methods: {
      handleSelection(optionSelected) {
        const action = optionSelected.label;
        if (action === this.$tr('previewExam')) {
          this.setExamsModal(ExamModals.PREVIEW_EXAM);
        } else if (action === this.$tr('editDetails')) {
          this.setExamsModal(AssignmentActions.EDIT_DETAILS);
        } else if (action === this.$tr('copyTo')) {
          this.setExamsModal(AssignmentActions.COPY);
        } else if (action === this.$tr('delete')) {
          this.setExamsModal(AssignmentActions.DELETE);
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
    },
    vuex: {
      getters: {
        examTakers: state => state.pageState.examTakers,
        classId: state => state.classId,
        exam: state => state.pageState.exam,
        learnerGroups: state => state.pageState.learnerGroups,
      },
      actions: {
        setExamsModal,
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

      // TODO
      viewByGroups: 'View by groups',
      allLearners: 'All learners',
      progress: 'Progress',
      started: 'Started',
    },
  };

</script>


<style lang="stylus" scoped></style>
