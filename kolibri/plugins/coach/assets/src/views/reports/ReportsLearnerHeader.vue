<template>

  <div>
    <p>
      <BackLink
        :to="classRoute('ReportsLearnerListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>
      <KLabeledIcon
        icon="person"
        :label="learner.name"
      />
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
        ref="tabList"
        :tabsId="REPORTS_LEARNERS_TABS_ID"
        :ariaLabel="$tr('reportLearners')"
        :activeTabId="activeTabId"
        :tabs="tabs"
        @click="() => saveTabsClick(REPORTS_LEARNERS_TABS_ID)"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { REPORTS_LEARNERS_TABS_ID, ReportsLearnersTabs } from '../../constants/tabsConstants';
  import { useCoachTabs } from '../../composables/useCoachTabs';

  export default {
    name: 'ReportsLearnerHeader',
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();
      return {
        saveTabsClick,
        wereTabsClickedRecently,
      };
    },
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
        REPORTS_LEARNERS_TABS_ID,
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
            this.learner.id === status.learner_id && status.status === this.STATUSES.completed,
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
            status.status === this.STATUSES.completed,
        );
        return statuses.length;
      },
      resourcesViewed() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            !this.contentIdIsForExercise(status.content_id) &&
            status.status !== this.STATUSES.notStarted,
        );
        return statuses.length;
      },
      tabs() {
        return [
          {
            id: ReportsLearnersTabs.REPORTS,
            label: this.coachString('reportsLabel'),
            to: this.classRoute('ReportsLearnerReportPage', {}),
          },
          {
            id: ReportsLearnersTabs.ACTIVITY,
            label: this.coachString('activityLabel'),
            to: this.classRoute('ReportsLearnerActivityPage', {}),
          },
        ];
      },
    },
    mounted() {
      // focus the active tab but only when it's likely
      // that this header was re-mounted as a result
      // of navigation after clicking a tab (focus shouldn't
      // be manipulated programatically in other cases, e.g.
      // when visiting the page for the first time)
      if (this.wereTabsClickedRecently(this.REPORTS_LEARNERS_TABS_ID)) {
        this.$nextTick(() => {
          this.$refs.tabList.focusActiveTab();
        });
      }
    },
    $trs: {
      back: {
        message: 'All learners',
        context:
          "Link that takes user back to the list of learners on the 'Reports' tab, from the individual learner's information page.",
      },
      reportLearners: {
        message: 'Report learners',
        context: 'Labels the Reports > Learners tab for screen reader users',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
