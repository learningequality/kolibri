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
            :entries="getGroupEntries(group.id)"
            :showGroupsColumn="false"
          />
        </div>
      </div>

      <div v-else>
        <p>
          <StatusSummary :tally="summaryTally" />
        </p>

        <ReportsExerciseLearners :entries="allEntries" />
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
        return this.getContentStatusTally(this.$route.params.exerciseId, this.recipients);
      },
      lessonGroups() {
        if (!this.lesson.groups.length) {
          return this.groups;
        }

        return this.groups.filter(group => this.lesson.groups.includes(group.id));
      },
      recipients() {
        return this.getLearnersForGroups(this.lesson.groups);
      },
      allEntries() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);

        const sorted = this._.sortBy(learners, ['name']);
        const mapped = sorted.map(learner => {
          const tableRow = {
            groups: this.getLearnerLessonGroups(learner.id),
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
      getLearnerLessonGroups(learnerId) {
        return this.lessonGroups.filter(group => group.member_ids.includes(learnerId));
      },
      getGroupEntries(groupId) {
        return this.allEntries.filter(entry => {
          const entryGroupIds = entry.groups.map(group => group.id);
          return entryGroupIds.includes(groupId);
        });
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
