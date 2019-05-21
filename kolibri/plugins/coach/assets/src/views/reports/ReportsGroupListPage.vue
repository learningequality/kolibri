<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <ReportsHeader />
      <CoreTable :emptyMessage="common$tr('groupListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ common$tr('groupNameLabel') }}</th>
            <th>{{ common$tr('lessonsLabel') }}</th>
            <th>{{ common$tr('quizzesLabel') }}</th>
            <th>{{ common$tr('learnersLabel') }}</th>
            <th>{{ common$tr('avgQuizScoreLabel') }}</th>
            <th>{{ common$tr('lastActivityLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" group />
                <KRouterLink
                  :text="tableRow.name"
                  :to="classRoute('ReportsGroupReportPage', { groupId: tableRow.id })"
                />
              </KLabeledIcon>
            </td>
            <td>
              {{ common$tr('integer', {value: tableRow.numLessons}) }}
            </td>
            <td>
              {{ common$tr('integer', {value: tableRow.numQuizzes}) }}
            </td>
            <td>
              {{ common$tr('integer', {value: tableRow.numLearners}) }}
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
  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsGroupListPage',
    components: {
      ReportsHeader,
      ElapsedTime,
    },
    mixins: [commonCoach],
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
    },
  };

</script>


<style lang="scss" scoped></style>
