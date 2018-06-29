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

    <k-checkbox
      :label="$tr('viewByGroups')"
      :checked="viewByGroups"
      @change="viewByGroups = !viewByGroups"
      :disabled="viewByGroupsIsDisabled"
    />

    <template v-if="reportGroupings.length">
      <div
        v-for="(reportGrouping, i) in reportGroupings"
        :key="i"
      >
        <h3>
          {{ viewByGroups ? reportGrouping[0].group.name || $tr('ungrouped') : $tr('allLearners') }}
        </h3>
        <p class="average-score">{{ getAverageScore(reportGrouping) }}</p>

        <core-table>
          <caption class="visuallyhidden">{{ $tr('examReport') }}</caption>
          <thead slot="thead">
            <tr>
              <th class="core-table-icon-col"></th>
              <th class="core-table-main-col">{{ $tr('name') }}</th>
              <th>{{ $tr('progress') }}</th>
              <th>{{ $tr('score') }}</th>
              <th v-if="!viewByGroups">{{ $tr('group') }}</th>
            </tr>
          </thead>
          <tbody slot="tbody">
            <tr v-for="(examTaker, i) in reportGrouping" :key="i">
              <td class="core-table-icon-col">
                <content-icon :kind="USER" />
              </td>
              <td class="core-table-main-col">
                <k-router-link
                  v-if="examTaker.progress !== undefined"
                  :text="examTaker.name"
                  :to="examDetailPageLink(examTaker.id)"
                />
                <template v-else>
                  {{ examTaker.name }}
                </template>
              </td>

              <td>
                <template v-if="(examTaker.progress === exam.question_count) || examTaker.closed">
                  {{ $tr('completed') }}
                </template>
                <template v-else-if="examTaker.progress !== undefined">
                  {{ $tr('remaining', { num: (exam.question_count - examTaker.progress) }) }}
                </template>
                <template v-else>
                  {{ $tr('notstarted') }}
                </template>
              </td>

              <td>

                {{
                  examTaker.score === undefined ?
                    '–' :
                    $tr('scorePercentage', { num: examTaker.score / exam.question_count })
                }}
              </td>

              <td v-if="!viewByGroups">{{ examTaker.group.name || '–' }}</td>
            </tr>
          </tbody>
        </core-table>
      </div>
    </template>

    <p v-else>{{ $tr('noExamData') }}</p>

    <manage-exam-modals />
  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import sumBy from 'lodash/sumBy';
  import orderBy from 'lodash/orderBy';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import { USER, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import { PageNames } from '../../../constants';
  import { setExamsModal } from '../../../state/actions/exam';
  import { Modals as ExamModals } from '../../../constants/examConstants';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';
  import AssignmentSummary from '../../assignments/AssignmentSummary';
  import ManageExamModals from './ManageExamModals';

  export default {
    name: 'examReportPage',
    components: {
      contentIcon,
      coreTable,
      kRouterLink,
      kDropdownMenu,
      AssignmentSummary,
      ManageExamModals,
      kCheckbox,
    },
    data() {
      return {
        viewByGroups: false,
      };
    },
    computed: {
      viewByGroupsIsDisabled() {
        return !this.learnerGroups.length || this.examTakers.every(learner => !learner.group.id);
      },
      reportGroupings() {
        let reportGroupings;
        if (this.viewByGroups) {
          reportGroupings = this.learnerGroups
            .map(group => this.examTakers.filter(learner => learner.group.id === group.id))
            .filter(grouping => grouping.length !== 0);
          reportGroupings = orderBy(
            reportGroupings,
            [grouping => grouping[0].group.name.toUpperCase()],
            ['asc']
          );
          reportGroupings.push(this.examTakers.filter(learner => !learner.group.id));
        } else {
          reportGroupings = [this.examTakers];
        }
        return reportGroupings.filter(grouping => grouping.length !== 0);
      },
      AssignmentActions() {
        return AssignmentActions;
      },
      USER() {
        return USER;
      },
      examKind() {
        return ContentNodeKinds.EXAM;
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
      getAverageScore(learners) {
        const examsInProgress = learners.filter(learner => learner.progress !== undefined);
        const totalScores = sumBy(examsInProgress, 'score');
        const averageScore = totalScores / examsInProgress.length / this.exam.question_count;
        return averageScore >= 0
          ? this.$tr('averageScore', { num: averageScore })
          : this.$tr('noAverageScore');
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
      noAverageScore: 'Average score: –',
      examReport: 'Exam report',
      completed: 'Completed',
      remaining: '{ num, number } {num, plural, one {question} other {questions}} remaining',
      notstarted: 'Not started',
      name: 'Name',
      progress: 'Progress',
      score: 'Score',
      scorePercentage: '{num, number, percent}',
      group: 'Group',
      noExamData: 'No data to show.',
      options: 'Options',
      previewExam: 'Preview exam',
      editDetails: 'Edit details',
      copyTo: 'Copy to',
      delete: 'Delete',
      viewByGroups: 'View by groups',
      allLearners: 'All learners',
      started: 'Started',
      ungrouped: 'Ungrouped',
    },
  };

</script>


<style lang="stylus" scoped></style>
