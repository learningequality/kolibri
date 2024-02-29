<template>

  <ReportsLessonBase :showLearners="true" :activeTabId="ReportsLessonTabs.LEARNERS">
    <KTabPanel :tabsId="REPORTS_LESSON_TABS_ID" :activeTabId="ReportsLessonTabs.LEARNERS" />
  </ReportsLessonBase>

</template>


<script>

  import { REPORTS_LESSON_TABS_ID, ReportsLessonTabs } from '../../constants/tabsConstants';
  import ReportsLessonBase from './ReportsLessonBase';

  export default {
    name: 'ReportsLessonLearnerListPage',
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
