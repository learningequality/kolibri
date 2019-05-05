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

      <KCheckbox
        :label="coachStrings.$tr('viewByGroupsLabel')"
        :checked="viewByGroups"
        @change="toggleGroupsView"
      />

      <template v-if="viewByGroups">
        <div v-for="group in nonEmptyGroups" :key="group.id">
          <h2>{{ group.name }}</h2>

          <ReportsExerciseLearners
            :entries="getTableEntries([group.id])"
            :showGroupsColumn="false"
          />
        </div>
      </template>

      <template v-else>
        <p>
          <StatusSummary :tally="summaryTally" />
        </p>

        <ReportsExerciseLearners :entries="getTableEntries()" />
      </template>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';
  import ReportsExerciseLearners from './ReportsExerciseLearners';

  export default {
    name: 'ReportsLessonExerciseLearnerListPage',
    components: {
      ReportsLessonExerciseHeader,
      ReportsExerciseLearners,
    },
    mixins: [commonCoach],
    data() {
      return {
        viewByGroups: false,
      };
    },
    computed: {
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      summaryTally() {
        const recipients = this.getLearnersForGroups(this.lesson.groups);
        return this.getContentStatusTally(this.$route.params.exerciseId, recipients);
      },
      nonEmptyGroups() {
        if (!this.groups || !this.groups.length) {
          return [];
        }

        return this.groups.filter(group => {
          return group.member_ids.length > 0;
        });
      },
    },
    methods: {
      toggleGroupsView() {
        this.viewByGroups = !this.viewByGroups;
      },
      // Return table entries for recipients belonging to groups.
      // If no group ids passed in, return entries for all lesson recipients.
      getTableEntries(groupIds) {
        if (!groupIds || !groupIds.length) {
          groupIds = this.lesson.groups;
        }

        const recipients = this.getLearnersForGroups(groupIds);
        const learners = recipients.map(learnerId => this.learnerMap[learnerId]);

        const sorted = this._.sortBy(learners, ['name']);
        const mapped = sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.exerciseId,
              learner.id
            ),
            exerciseLink: this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT, {
              learnerId: learner.id,
            }),
          };
          Object.assign(tableRow, learner);

          return tableRow;
        });

        return mapped;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
