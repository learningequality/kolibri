<template>

  <ReportsLessonBase
    :showResources="true"
    :activeTabId="ReportsLessonTabs.REPORTS"
  >
    <KTabPanel
      :tabsId="REPORTS_LESSON_TABS_ID"
      :activeTabId="ReportsLessonTabs.REPORTS"
    />
  </ReportsLessonBase>

</template>


<script>

  import { REPORTS_LESSON_TABS_ID, ReportsLessonTabs } from '../../constants/tabsConstants';
  import ReportsLessonBase from './ReportsLessonBase';

  export default {
    name: 'ReportsLessonReportPage',
    components: {
      ReportsLessonBase,
    },
    data() {
      return {
        REPORTS_LESSON_TABS_ID,
        ReportsLessonTabs,
      };
    },
  };

</script>
