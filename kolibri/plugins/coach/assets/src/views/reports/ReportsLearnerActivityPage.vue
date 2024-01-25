<template>

  <CoachAppBarPage
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >

    <KPageContainer>

      <ReportsLearnerHeader :enablePrint="true" :activeTabId="LearnersTabs.ACTIVITY" />
      <KTabsPanel
        :tabsId="LEARNERS_TABS_ID"
        :activeTabId="LearnersTabs.ACTIVITY"
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
  import { LEARNERS_TABS_ID, LearnersTabs } from '../../constants/tabsConstants';
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
        LEARNERS_TABS_ID,
        LearnersTabs,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
