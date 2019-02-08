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

      <CoreTable>
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
                v-if="tableRow.status.status !== STATUSES.notStarted"
                :text="tableRow.name"
                :to="link(tableRow.id)"
              />
              <template v-else>{{ tableRow.name }}</template>
            </td>
            <td>
              <StatusSimple :status="tableRow.status.status" />
            </td>
            <td>
              <TimeDuration :seconds="tableRow.status.time_spent" />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
            </td>
            <td>
              <ElapsedTime
                :date="tableRow.status.last_activity"
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
            status: this.getContentStatusObjForLearner(this.$route.params.exerciseId, learner.id),
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
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
