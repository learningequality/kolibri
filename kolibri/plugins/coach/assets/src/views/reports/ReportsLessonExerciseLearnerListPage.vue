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

      <KCheckbox
        :label="coachStrings.$tr('onlyActiveLearnersLabel')"
        :checked="showOnlyActive"
        @change="showOnlyActive = !showOnlyActive"
      />
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
                v-if="showLink(tableRow)"
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
                :seconds="showTimeDuration(tableRow)"
              />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
            </td>
            <td>
              <ElapsedTime
                :date="showElapsedTime(tableRow)"
              />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import { localeCompare } from 'kolibri.utils.i18n';
  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';

  export default {
    name: 'ReportsLessonExerciseLearnerListPage',
    components: {
      ReportsLessonExerciseHeader,
      KCheckbox,
    },
    mixins: [commonCoach],
    data() {
      return {
        showOnlyActive: false,
      };
    },
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
        let learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);

        if (this.showOnlyActive === true) {
          learners = this.filterByActive(learners);
        }

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
      showLink(tableRow) {
        return tableRow.statusObj.status !== this.STATUSES.notStarted;
      },
      showTimeDuration(tableRow) {
        if (tableRow.statusObj.status !== this.STATUSES.notStarted) {
          return tableRow.statusObj.time_spent;
        }
        return undefined;
      },
      showElapsedTime(tableRow) {
        if (tableRow.statusObj.status !== this.STATUSES.notStarted) {
          return tableRow.statusObj.last_activity;
        }
        return undefined;
      },
      active(learner) {
        return this.activeLearners.includes(learner.id);
      },
      filterByActive(learners) {
        const sortByKey = 'username';
        const predicate = learner => this.active(learner);
        return learners.filter(predicate).sort((a, b) => {
          return localeCompare(a[sortByKey], b[sortByKey]);
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
