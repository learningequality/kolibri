<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsLessonExerciseHeader />

      <!-- TODO COACH
      <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />
      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
       -->

      <p>
        <StatusSummary :tally="tally" />
      </p>

      <CoreTable :emptyMessage="coachStrings.$tr('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('nameLabel') }}</th>
            <th>{{ coachStrings.$tr('progressLabel') }}</th>
            <th>{{ coachStrings.$tr('timeSpentLabel') }}</th>
            <th>{{ coachStrings.$tr('groupsLabel') }}</th>
            <th>{{ coachStrings.$tr('lastActivityLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                v-if="showComponent(tableRow.statusObj.status)"
                :text="tableRow.name"
                :to="link(tableRow.id)"
              />
              <template v-else>{{ tableRow.name }}</template>
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td>
              <TimeDuration
                v-if="showComponent(tableRow.statusObj.status)"
                :seconds="tableRow.statusObj.time_spent"
              />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
            </td>
            <td>
              <ElapsedTime
                v-if="showComponent(tableRow.statusObj.status)"
                :date="tableRow.statusObj.last_activity"
              />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import { STATUSES } from '../../modules/classSummary/constants';

  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';

  export default {
    name: 'ReportsLessonExerciseLearnerListPage',
    components: {
      ReportsLessonExerciseHeader,
    },
    mixins: [commonCoach],
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      recipients() {
        return this.getLearnersForGroups(this.lesson.groups);
      },
      tally() {
        return this.getContentStatusTally(this.$route.params.exerciseId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        const mapped = sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.exerciseId,
              learner.id
            ),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
        return mapped;
      },
    },
    methods: {
      link(learnerId) {
        return this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT, { learnerId });
      },
      showComponent(status) {
        return status !== STATUSES.notStarted;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
