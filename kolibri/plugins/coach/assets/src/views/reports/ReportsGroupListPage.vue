<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <ReportsHeader />
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('groupNameLabel') }}</td>
            <td>{{ coachStrings.$tr('lessonsLabel') }}</td>
            <td>{{ coachStrings.$tr('quizzesLabel') }}</td>
            <td>{{ coachStrings.$tr('learnersLabel') }}</td>
            <td>{{ coachStrings.$tr('avgQuizScoreLabel') }}</td>
            <td>{{ coachStrings.$tr('lastActivityLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                :text="tableRow.name"
                :to="classRoute('ReportsGroupReportPage', { groupId: tableRow.id })"
              />
            </td>
            <td>
              {{ coachStrings.$tr('integer', {value: tableRow.numLessons}) }}
            </td>
            <td>
              {{ coachStrings.$tr('integer', {value: tableRow.numQuizzes}) }}
            </td>
            <td>
              {{ coachStrings.$tr('integer', {value: tableRow.numLearners}) }}
            </td>
            <td><Score :value="tableRow.avgScore" /></td>
            <td><ElapsedTime :date="tableRow.lastActivity" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
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
      ...mapGetters('classSummary', [
        'groups',
        'lessons',
        'exams',
        'examStatuses',
        'contentStatuses',
      ]),
      table() {
        const sorted = this.dataHelpers.sortBy(this.groups, ['name']);
        const mapped = sorted.map(group => {
          const groupLessons = this.lessons.filter(
            lesson => lesson.groups.includes(group.id) || !lesson.groups.length
          );
          const groupExams = this.exams.filter(
            exam => exam.groups.includes(group.id) || !exam.groups.length
          );
          const learnerIds = this.dataHelpers.learnersForGroups([group.id]);
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
        return mapped;
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
        return this.dataHelpers.meanBy(relevantStatuses, 'score');
      },
      lastActivity(learnerIds) {
        const statuses = [
          ...this.examStatuses.filter(
            status => learnerIds.includes(status.learner_id) && status.status
          ),
          ...this.contentStatuses.filter(
            status => learnerIds.includes(status.learner_id) && status.status
          ),
        ];
        return this.dataHelpers.maxBy(statuses, 'last_activity').last_activity;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
