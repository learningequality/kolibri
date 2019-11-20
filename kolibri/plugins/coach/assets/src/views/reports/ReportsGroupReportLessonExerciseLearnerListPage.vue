<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsGroupReportLessonExerciseHeader />

      <ReportsControls>
        <p>
          <StatusSummary :tally="tally" />
        </p>
      </ReportsControls>

      <CoreTable :emptyMessage="coachString('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('nameLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('timeSpentLabel') }}</th>
            <th>{{ coachString('groupsLabel') }}</th>
            <th>{{ coachString('lastActivityLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                v-if="showLink(tableRow.statusObj.status)"
                :text="tableRow.name"
                :to="link(tableRow.id)"
              />
              <template v-else>
                {{ tableRow.name }}
              </template>
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td>
              <TimeDuration :seconds="tableRow.statusObj.time_spent" />
            </td>
            <td>
              <TruncatedItemList :items="tableRow.groups" />
            </td>
            <td>
              <ElapsedTime :date="tableRow.statusObj.last_activity" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import ReportsGroupReportLessonExerciseHeader from './ReportsGroupReportLessonExerciseHeader';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsGroupReportLessonExerciseLearnerListPage',
    components: {
      ReportsGroupReportLessonExerciseHeader,
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      recipients() {
        return this.getLearnersForGroups([this.$route.params.groupId]);
      },
      tally() {
        return this.getContentStatusTally(this.$route.params.exerciseId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        return sorted.map(learner => {
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
      },
    },
    methods: {
      link(learnerId) {
        return this.classRoute(PageNames.REPORTS_GROUP_REPORT_LESSON_EXERCISE_LEARNER_PAGE_ROOT, {
          learnerId,
        });
      },
      showLink(status) {
        return status !== this.STATUSES.notStarted;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .stats {
    margin-right: 16px;
  }

</style>
