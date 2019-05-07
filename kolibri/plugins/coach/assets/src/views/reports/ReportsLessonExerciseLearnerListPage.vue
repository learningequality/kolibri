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

      <div v-if="viewByGroups">
        <div
          v-for="group in lessonGroups"
          :key="group.id"
          class="group"
        >
          <h2 class="group-title">
            {{ group.name }}
          </h2>

          <p>
            <StatusSummary
              :tally="getGroupTally(group.id)"
              :verbose="false"
            />
          </p>

          <ReportsExerciseLearners
            :entries="getTableEntries([group.id])"
            :showGroupsColumn="false"
          />
        </div>
      </div>

      <div v-else>
        <p>
          <StatusSummary :tally="summaryTally" />
        </p>

        <ReportsExerciseLearners :entries="getTableEntries()" />
      </div>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import { LastPages } from '../../constants/lastPagesConstants';
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
        viewByGroups: Boolean(this.$route.query && this.$route.query.groups),
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
      lessonGroups() {
        if (!this.lesson.groups.length) {
          return this.groups;
        }

        return this.groups.filter(group => this.lesson.groups.includes(group.id));
      },
    },
    methods: {
      toggleGroupsView() {
        this.viewByGroups = !this.viewByGroups;

        let query;
        if (this.viewByGroups) {
          query = { ...this.$route.query, groups: 'true' };
        } else {
          query = { ...this.$route.query, groups: undefined };
        }

        this.$router.replace({ query });
      },
      getExerciseLearnerLink(learnerId) {
        const link = this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_LEARNER_PAGE_ROOT, {
          learnerId,
        });

        if (this.viewByGroups) {
          link.query = { ...link.query, last: LastPages.EXERCISE_LEARNER_LIST_BY_GROUPS };
        }

        return link;
      },
      getGroupTally(groupId) {
        const recipients = this.getLearnersForGroups([groupId]);
        return this.getContentStatusTally(this.$route.params.exerciseId, recipients);
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
            exerciseLearnerLink: this.getExerciseLearnerLink(learner.id),
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

  .group:not(:first-child) {
    margin-top: 42px;
  }

  .group-title {
    margin-bottom: 42px;
  }

</style>
