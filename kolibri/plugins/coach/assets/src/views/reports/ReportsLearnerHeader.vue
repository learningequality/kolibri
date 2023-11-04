<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsLearnerListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>
      <KLabeledIcon icon="person" :label="learner.name" />
    </h1>
    <HeaderTable>
      <HeaderTableRow>
        <template #key>
          {{ coreString('usernameLabel') }}
        </template>
        <template #value>
          {{ learner.username }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template #key>
          {{ coachString('groupsLabel') }}
        </template>
        <template #value>
          <TruncatedItemList :items="getGroupNamesForLearner(learner.id)" />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template #key>
          {{ coachString('avgScoreLabel') }}
        </template>
        <template #value>
          {{ $formatNumber(avgScore, { style: 'percent', maximumFractionDigits: 0 }) }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template #key>
          {{ coachString('exercisesCompletedLabel') }}
        </template>
        <template #value>
          {{ $formatNumber(exercisesCompleted) }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template #key>
          {{ coachString('resourcesViewedLabel') }}
        </template>
        <template #value>
          {{ $formatNumber(resourcesViewed) }}
        </template>
      </HeaderTableRow>
    </HeaderTable>
    <HeaderTabs :enablePrint="enablePrint">
      <KTabsList
        :tabsId="LEARNERS_TABS_ID"
        :activeTabId="activeTabId"
        ariaLabel="Coach learners"
        :tabs="tabs"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { LEARNERS_TABS_ID, LearnersTabs } from '../../constants/tabsConstants';

  export default {
    name: 'ReportsLearnerHeader',
    mixins: [commonCoach, commonCoreStrings],
    props: {
      enablePrint: {
        type: Boolean,
        required: false,
        default: false,
      },
      activeTabId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        LEARNERS_TABS_ID,
      };
    },
    computed: {
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      learnerContentStatuses() {
        return this.contentStatuses.filter(status => this.learner.id === status.learner_id);
      },
      avgScore() {
        const statuses = this.examStatuses.filter(
          status =>
            this.learner.id === status.learner_id && status.status === this.STATUSES.completed
        );
        if (!statuses.length) {
          return null;
        }
        return this._.meanBy(statuses, 'score');
      },
      exercisesCompleted() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            this.contentIdIsForExercise(status.content_id) &&
            status.status === this.STATUSES.completed
        );
        return statuses.length;
      },
      resourcesViewed() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            !this.contentIdIsForExercise(status.content_id) &&
            status.status !== this.STATUSES.notStarted
        );
        return statuses.length;
      },
      tabs() {
        return [
          {
            id: LearnersTabs.REPORTS,
            label: this.coachString('reportsLabel'),
            to: this.classRoute('ReportsLearnerReportPage', {}),
          },
          {
            id: LearnersTabs.ACTIVITY,
            label: this.coachString('activityLabel'),
            to: this.classRoute('ReportsLearnerActivityPage', {}),
          },
        ];
      },
    },
    $trs: {
      back: {
        message: 'All learners',
        context:
          "Link that takes user back to the list of learners on the 'Reports' tab, from the individual learner's information page.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
