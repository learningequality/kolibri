<template>

  <div>
    <AssignmentSummary
      :kind="examKind"
      :title="exam.title"
      :active="exam.active"
      :recipients="exam.assignments"
      :groups="learnerGroups"
      @changeStatus="setExamsModal(AssignmentActions.CHANGE_STATUS)"
    >
      <KDropdownMenu
        slot="optionsDropdown"
        :text="$tr('options')"
        :options="actionOptions"
        appearance="raised-button"
        @select="setExamsModal($event.value)"
      />
    </AssignmentSummary>

    <h2>{{ $tr('examReport') }}</h2>

    <KCheckbox
      :label="$tr('viewByGroups')"
      :checked="viewByGroups"
      :disabled="viewByGroupsIsDisabled"
      @change="viewByGroups = !viewByGroups"
    />

    <template v-if="reportGroupings.length">
      <div
        v-for="(reportGrouping, i) in reportGroupings"
        :key="i"
      >
        <h3>
          {{ viewByGroups ? reportGrouping[0].group.name || $tr('ungrouped') : $tr('allLearners') }}
        </h3>
        <p class="average-score">{{ averageScoreText(reportGrouping) }}</p>

        <CoreTable>
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
          <transition-group slot="tbody" tag="tbody" name="list">
            <tr v-for="(examTaker, j) in reportGrouping" :key="j">
              <td class="core-table-icon-col">
                <ContentIcon :kind="USER" />
              </td>
              <td class="core-table-main-col">
                <KRouterLink
                  v-if="examTaker.progress !== undefined"
                  :text="examTaker.name"
                  :to="examDetailPageLink(examTaker.id)"
                />
                <span v-else dir="auto">
                  {{ examTaker.name }}
                </span>
              </td>
              <td>
                {{ examTakerProgressText(examTaker) }}
              </td>
              <td>
                <template v-if="examTaker.score !== undefined">
                  {{ examTakerScoreText(examTaker) }}
                </template>
                <KEmptyPlaceholder v-else />
              </td>
              <td v-if="!viewByGroups" dir="auto">
                <template v-if="examTaker.group.name">
                  {{ examTaker.group.name }}
                </template>
                <KEmptyPlaceholder v-else />
              </td>
            </tr>
          </transition-group>
        </CoreTable>
      </div>
    </template>

    <p v-else>{{ $tr('noExamData') }}</p>

    <ManageExamModals />
  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import sumBy from 'lodash/sumBy';
  import orderBy from 'lodash/orderBy';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import { USER, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import KEmptyPlaceholder from 'kolibri.coreVue.components.KEmptyPlaceholder';
  import { PageNames } from '../../../constants';
  import { Modals as ExamModals } from '../../../constants/examConstants';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';
  import AssignmentSummary from '../../plan/assignments/AssignmentSummary';
  import ManageExamModals from './ManageExamModals';

  export default {
    name: 'ExamReportPage',
    metaInfo() {
      return {
        title: this.exam.title,
      };
    },
    components: {
      ContentIcon,
      CoreTable,
      KRouterLink,
      KDropdownMenu,
      AssignmentSummary,
      ManageExamModals,
      KCheckbox,
      KEmptyPlaceholder,
    },
    data() {
      return {
        viewByGroups: false,
        AssignmentActions,
        USER,
        examKind: ContentNodeKinds.EXAM,
      };
    },
    computed: {
      ...mapState(['reportRefreshInterval']),
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('examReport', ['examTakers', 'exam', 'learnerGroups']),
      ...mapGetters('examReport', ['learnerIsExamAssignee']),
      viewByGroupsIsDisabled() {
        return !this.learnerGroups.length || this.examAssignees.every(learner => !learner.group.id);
      },
      examAssignees() {
        return this.examTakers.filter(this.learnerIsExamAssignee);
      },
      reportGroupings() {
        let reportGroupings;
        if (this.viewByGroups) {
          reportGroupings = this.learnerGroups
            .map(group => this.examAssignees.filter(learner => learner.group.id === group.id))
            .filter(grouping => grouping.length !== 0);
          reportGroupings = orderBy(
            reportGroupings,
            [grouping => grouping[0].group.name.toUpperCase()],
            ['asc']
          );
          reportGroupings.push(this.examAssignees.filter(learner => !learner.group.id));
        } else {
          reportGroupings = [this.examAssignees];
        }
        return reportGroupings.filter(grouping => grouping.length !== 0);
      },
      actionOptions() {
        return [
          { label: this.$tr('previewExam'), value: ExamModals.PREVIEW_EXAM },
          { label: this.$tr('editDetails'), value: AssignmentActions.EDIT_DETAILS },
          { label: this.$tr('copyExamOptionLabel'), value: AssignmentActions.COPY },
          { label: this.$tr('delete'), value: AssignmentActions.DELETE },
        ];
      },
    },
    mounted() {
      this.intervalId = setInterval(this.refreshReportData, this.reportRefreshInterval);
    },
    beforeDestroy() {
      this.intervalId = clearInterval(this.intervalId);
    },
    methods: {
      ...mapActions('examReport', ['setExamsModal']),
      // The data needed to do a proper refresh. See showExamReportPage for details
      refreshReportData() {
        return this.$store.dispatch('examReport/setTableData', {
          examId: this.exam.id,
          classId: this.classId,
          isSamePage: samePageCheckGenerator(this.$store),
        });
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
      examTakerProgressText({ progress, closed }) {
        const { question_count } = this.exam;
        if (closed) {
          return this.$tr('completed');
        } else if (progress !== undefined) {
          return this.$tr('remaining', { num: question_count - progress });
        } else {
          return this.$tr('notstarted');
        }
      },
      examTakerScoreText({ score }) {
        return this.$tr('scorePercentage', { num: score / this.exam.question_count });
      },
      averageScoreText(learners) {
        const examsInProgress = learners.filter(learner => learner.progress !== undefined);
        const totalScores = sumBy(examsInProgress, 'score');
        const averageScore = totalScores / examsInProgress.length / this.exam.question_count;
        return averageScore >= 0
          ? this.$tr('averageScore', { num: averageScore })
          : this.$tr('noAverageScore');
      },
    },
    $trs: {
      averageScore: 'Average score: {num, number, percent}',
      noAverageScore: 'Average score: –',
      examReport: 'Quiz report',
      completed: 'Completed',
      remaining: '{ num, number } {num, plural, one {question} other {questions}} remaining',
      notstarted: 'Not started',
      name: 'Full Name',
      progress: 'Progress',
      score: 'Score',
      scorePercentage: '{num, number, percent}',
      group: 'Group',
      noExamData: 'No data to show.',
      options: 'Options',
      previewExam: 'Preview',
      editDetails: 'Edit details',
      copyExamOptionLabel: 'Copy quiz',
      delete: 'Delete',
      viewByGroups: 'View by groups',
      allLearners: 'All learners',
      started: 'Started',
      ungrouped: 'Ungrouped',
    },
  };

</script>


<style lang="scss" scoped></style>
