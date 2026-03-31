<template>

  <CoachAppBarPage :loading="pageLoading">
    <KGrid gutter="16">
      <KGridItem>
        <OverviewBlock />
        <KRouterLink
          v-if="
            facilityConfig.picture_password_settings !== null &&
              facilityConfig.picture_password_settings !== undefined
          "
          :text="viewPasswordsAction$()"
          appearance="raised-button"
          :to="{ name: PageNames.LEARNER_PASSWORDS, params: { classId } }"
          class="view-passwords-link"
        />
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

  import { computed } from 'vue';
  import { currentLanguage } from 'kolibri/utils/i18n';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswordStrings';
  import store from 'kolibri/store';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import commonCoach from '../../common';
  import { PageNames } from '../../../constants';
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
      const classId = computed(() => store.state.classSummary.id);
      const { viewPasswordsAction$ } = picturePasswordStrings;

      return {
        pageLoading,
        facilityConfig,
        currentLanguage,
        classId,
        viewPasswordsAction$,
        PageNames,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .new-coach-block {
    min-width: 0;
  }

  .view-passwords-link {
    margin-top: 16px;
  }

</style>
