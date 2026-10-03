<template>

  <CoachAppBarPage :loading="pageLoading">
    <KPageContainer>
      <p>
        <BackLink
          :to="classRoute('HomePage', {})"
          :text="coreString('classHome')"
        />
      </p>

      <ActivityList :noActivityString="$tr('noActivityLabel')" />
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import useCoreCoach from '../../composables/useCoreCoach';
  import { coachStrings } from '../common/commonCoachStrings';
  import { nStringsMixin } from '../common/notifications/notificationStrings';
  import ActivityList from '../common/notifications/ActivityList';

  export default {
    name: 'HomeActivityPage',
    components: {
      ActivityList,
      CoachAppBarPage,
    },
    mixins: [commonCoach, nStringsMixin, commonCoreStrings],
    setup() {
      const { className } = useCoreCoach();
      usePageTitle(() => [coachStrings.activityLabel$(), className.value]);
      return { pageLoading };
    },
    $trs: {
      noActivityLabel: {
        message: 'No activity in your class',
        context:
          "Message displayed in the 'Class activity' section when there has been no activity in the class made by learners.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .show-more {
    height: 100px;
  }

</style>
