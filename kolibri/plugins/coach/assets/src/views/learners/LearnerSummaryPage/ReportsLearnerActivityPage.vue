<template>

  <CoachAppBarPage>
    <KPageContainer>
      <LearnerHeader />
    </KPageContainer>

    <KPageContainer>
      <HeaderTabs :enablePrint="true">
        <KTabsList
          ref="tabList"
          :tabsId="REPORTS_LEARNERS_TABS_ID"
          :ariaLabel="$tr('reportLearners')"
          :activeTabId="ReportsLearnersTabs.ACTIVITY"
          :tabs="tabs"
          @click="() => saveTabsClick(REPORTS_LEARNERS_TABS_ID)"
        />
      </HeaderTabs>
      <KTabsPanel
        :tabsId="REPORTS_LEARNERS_TABS_ID"
        :activeTabId="ReportsLearnersTabs.ACTIVITY"
      >
        <ActivityList
          embeddedPageName="ReportsLearnerActivityPage"
          :noActivityString="coachString('activityListEmptyState')"
        />
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import ActivityList from '../../common/notifications/ActivityList';
  import { REPORTS_LEARNERS_TABS_ID, ReportsLearnersTabs } from '../../../constants/tabsConstants';
  import { useCoachTabs } from '../../../composables/useCoachTabs';
  import { PageNames } from '../../../constants';
  import LearnerHeader from './LearnerHeader';

  export default {
    name: 'ReportsLearnerActivityPage',
    components: {
      ActivityList,
      CoachAppBarPage,
      LearnerHeader,
    },
    mixins: [commonCoach],
    setup() {
      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();
      return {
        saveTabsClick,
        wereTabsClickedRecently,
      };
    },
    data() {
      return {
        REPORTS_LEARNERS_TABS_ID,
        ReportsLearnersTabs,
      };
    },
    computed: {
      tabs() {
        return [
          {
            id: ReportsLearnersTabs.REPORTS,
            label: this.coachString('reportsLabel'),
            to: this.classRoute(PageNames.LEARNER_SUMMARY, {}),
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
      reportLearners: {
        message: 'Report learners',
        context: 'Labels the Reports > Learners tab for screen reader users',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
