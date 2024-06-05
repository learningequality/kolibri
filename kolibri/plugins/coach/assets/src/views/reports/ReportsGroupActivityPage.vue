<template>

  <CoachAppBarPage>

    <KPageContainer>

      <ReportsGroupHeader
        :activeTabId="ReportsGroupTabs.ACTIVITY"
        :enablePrint="true"
      />
      <KTabsPanel
        :tabsId="REPORTS_GROUP_TABS_ID"
        :activeTabId="ReportsGroupTabs.ACTIVITY"
      >
        <ActivityList
          embeddedPageName="ReportsGroupActivityPage"
          :noActivityString="coachString('activityListEmptyState')"
        />
      </KTabsPanel>

    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoach from '../common';
  import { REPORTS_GROUP_TABS_ID, ReportsGroupTabs } from '../../constants/tabsConstants';
  import CoachAppBarPage from '../CoachAppBarPage';
  import ActivityList from '../common/notifications/ActivityList';
  import ReportsGroupHeader from './ReportsGroupHeader';

  export default {
    name: 'ReportsGroupActivityPage',
    components: {
      ActivityList,
      CoachAppBarPage,
      ReportsGroupHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        REPORTS_GROUP_TABS_ID,
        ReportsGroupTabs,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
