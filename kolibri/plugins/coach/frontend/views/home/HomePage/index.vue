<template>

  <CoachAppBarPage :loading="pageLoading">
    <KGrid gutter="16">
      <KGridItem>
        <OverviewBlock />
      </KGridItem>
      <KGridItem :layout12="{ span: 6 }">
        <KGrid gutter="16">
          <KGridItem v-if="currentLanguage === 'en' && facilityConfig.enable_mark_attendance">
            <AttendanceBlock />
          </KGridItem>
          <KGridItem>
            <QuizzesBlock />
          </KGridItem>
          <KGridItem>
            <LessonsBlock />
          </KGridItem>
        </KGrid>
      </KGridItem>
      <KGridItem :layout12="{ span: 6 }">
        <ActivityBlock />
      </KGridItem>
    </KGrid>
  </CoachAppBarPage>

</template>


<script>

  import { currentLanguage } from 'kolibri/utils/i18n';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import commonCoach from '../../common';
  import AttendanceBlock from './AttendanceBlock';
  import OverviewBlock from './OverviewBlock';
  import ActivityBlock from './ActivityBlock';
  import LessonsBlock from './LessonsBlock';
  import QuizzesBlock from './QuizzesBlock';

  export default {
    name: 'HomePage',
    components: {
      CoachAppBarPage,
      AttendanceBlock,
      OverviewBlock,
      ActivityBlock,
      LessonsBlock,
      QuizzesBlock,
    },
    mixins: [commonCoach],
    setup() {
      const { facilityConfig } = useFacility();

      return {
        pageLoading,
        facilityConfig,
        currentLanguage,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: 0;
  }

</style>
