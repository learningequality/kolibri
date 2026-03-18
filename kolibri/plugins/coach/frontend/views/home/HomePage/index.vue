<template>

  <CoachAppBarPage>
    <KGrid gutter="16">
      <KGridItem>
        <OverviewBlock />
      </KGridItem>
      <KGridItem :layout12="{ span: 6 }">
        <KGrid gutter="16">
          <KGridItem v-if="facilityConfig.enable_mark_attendance">
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

  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { onBeforeMount } from 'vue';
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
      const { getFacilityConfig, facilityConfig } = useFacilities();

      onBeforeMount(async () => {
        await getFacilityConfig();
      });

      return {
        facilityConfig,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: 0;
  }

</style>
