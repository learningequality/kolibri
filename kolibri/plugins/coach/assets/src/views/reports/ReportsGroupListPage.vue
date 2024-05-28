<template>

  <CoachAppBarPage>

    <KPageContainer>
      <ReportsHeader
        :activeTabId="ReportsTabs.GROUPS"
        :title="$isPrint ? $tr('printLabel', { className }) : null"
      />
      <KTabsPanel
        :tabsId="REPORTS_TABS_ID"
        :activeTabId="ReportsTabs.GROUPS"
      >
        <ReportsControls @export="exportCSV" />
        <CoreTable :emptyMessage="coachString('groupListEmptyState')">
          <template #headers>
            <th>{{ coachString('groupNameLabel') }}</th>
            <th>{{ coreString('lessonsLabel') }}</th>
            <th>{{ coreString('quizzesLabel') }}</th>
            <th>{{ coreString('learnersLabel') }}</th>
            <th>{{ coachString('avgScoreLabel') }}</th>
            <th>{{ coachString('lastActivityLabel') }}</th>
          </template>
          <template #tbody>
            <transition-group
              tag="tbody"
              name="list"
            >
              <tr
                v-for="tableRow in table"
                :key="tableRow.id"
              >
                <td>
                  <KRouterLink
                    :text="tableRow.name"
                    :to="classRoute('ReportsGroupReportPage', { groupId: tableRow.id })"
                    icon="group"
                  />
                </td>
                <td>
                  {{ $formatNumber(tableRow.numLessons) }}
                </td>
                <td>
                  {{ $formatNumber(tableRow.numQuizzes) }}
                </td>
                <td>
                  {{ $formatNumber(tableRow.numLearners) }}
                </td>
                <td>
                  <Score :value="tableRow.avgScore" />
                </td>
                <td>
                  <ElapsedTime :date="tableRow.lastActivity" />
                </td>
              </tr>
            </transition-group>
          </template>
        </CoreTable>
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import sortBy from 'lodash/sortBy';
  import { REPORTS_TABS_ID, ReportsTabs } from '../../constants/tabsConstants';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsGroupListPage',
    components: {
      CoachAppBarPage,
      ReportsControls,
      ReportsHeader,
      ElapsedTime,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        REPORTS_TABS_ID,
        ReportsTabs,
      };
    },
    computed: {
      table() {
        const sorted = sortBy(this.groups, ['name']);
        return sorted.map(group => {
          const groupLessons = this.lessons.filter(
            lesson => lesson.groups.includes(group.id) || !lesson.groups.length
          );
          const groupExams = this.exams.filter(
            exam => exam.groups.includes(group.id) || !exam.groups.length
          );
          const learnerIds = this.getLearnersForGroups([group.id]);
          const tableRow = {
            numLessons: groupLessons.length,
            numQuizzes: groupExams.length,
            numLearners: learnerIds.length,
            avgScore: this.avgScore(learnerIds),
            lastActivity: this.lastActivity(learnerIds),
          };
          Object.assign(tableRow, group);
          return tableRow;
        });
      },
    },
    methods: {
      avgScore(learnerIds) {
        const relevantStatuses = this.examStatuses.filter(
          status =>
            learnerIds.includes(status.learner_id) && status.status === this.STATUSES.completed
        );
        if (!relevantStatuses.length) {
          return null;
        }
        return this._.meanBy(relevantStatuses, 'score');
      },
      lastActivity(learnerIds) {
        const statuses = [
          ...this.examStatuses.filter(status => learnerIds.includes(status.learner_id)),
          ...this.contentStatuses.filter(
            status =>
              status.status !== this.STATUSES.notStarted && learnerIds.includes(status.learner_id)
          ),
        ];

        return statuses.length ? this.maxLastActivity(statuses) : null;
      },
      exportCSV() {
        const columns = [
          ...csvFields.name('groupNameLabel'),
          {
            name: this.coachString('lessonsLabel'),
            key: 'numLessons',
          },
          {
            name: this.coachString('quizzesLabel'),
            key: 'numQuizzes',
          },
          {
            name: this.coachString('learnersLabel'),
            key: 'numLearners',
          },
          ...csvFields.avgScore(true),
          ...csvFields.lastActivity(),
        ];

        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.table);
      },
    },
    $trs: {
      printLabel: {
        message: '{className} Groups',
        context: 'Indicates the groups that are associated with a specific class.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

</style>
