<template>

  <CoachAppBarPage>

    <KPageContainer>

      <ReportsLearnerHeader :enablePrint="true" :activeTabId="ReportsLearnersTabs.ACTIVITY" />
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

  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import ActivityList from '../common/notifications/ActivityList';
  import { REPORTS_LEARNERS_TABS_ID, ReportsLearnersTabs } from '../../constants/tabsConstants';
  import ReportsLearnerHeader from './ReportsLearnerHeader';

  export default {
    name: 'ReportsLearnerActivityPage',
    components: {
      ActivityList,
      CoachAppBarPage,
      ReportsLearnerHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        REPORTS_LEARNERS_TABS_ID,
        ReportsLearnersTabs,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
