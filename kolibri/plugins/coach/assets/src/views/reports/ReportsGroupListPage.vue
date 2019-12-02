<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <ReportsHeader :title="$isPrint ? $tr('printLabel', {className}) : null" />
      <ReportsControls @export="exportCSV" />
      <CoreTable :emptyMessage="coachString('groupListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('groupNameLabel') }}</th>
            <th>{{ coreString('lessonsLabel') }}</th>
            <th>{{ coreString('quizzesLabel') }}</th>
            <th>{{ coreString('learnersLabel') }}</th>
            <th>{{ coachString('avgQuizScoreLabel') }}</th>
            <th>{{ coachString('lastActivityLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon icon="group">
                <KRouterLink
                  :text="tableRow.name"
                  :to="classRoute('ReportsGroupReportPage', { groupId: tableRow.id })"
                />
              </KLabeledIcon>
            </td>
            <td>
              {{ coachString('integer', {value: tableRow.numLessons}) }}
            </td>
            <td>
              {{ coachString('integer', {value: tableRow.numQuizzes}) }}
            </td>
            <td>
              {{ coachString('integer', {value: tableRow.numLearners}) }}
            </td>
            <td><Score :value="tableRow.avgScore" /></td>
            <td><ElapsedTime :date="tableRow.lastActivity" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsGroupListPage',
    components: {
      ReportsControls,
      ReportsHeader,
      ElapsedTime,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      table() {
        const sorted = this._.sortBy(this.groups, ['name']);
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
      printLabel: '{className} Groups',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

</style>
