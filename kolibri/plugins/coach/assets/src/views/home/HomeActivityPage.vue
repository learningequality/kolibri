<template>

  <CoachAppBarPage>
    <KPageContainer>
      <p>
        <BackLink
          :to="classRoute('HomePage', {})"
          :text="coreString('classHome')"
        />
      </p>

      <ActivityList
        :noActivityString="$tr('noActivityLabel')"
        embeddedPageName="HomeActivityPage"
      />
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import { nStringsMixin } from '../common/notifications/notificationStrings';
  import ActivityList from '../common/notifications/ActivityList';

  export default {
    name: 'HomeActivityPage',
    components: {
      ActivityList,
      CoachAppBarPage,
    },
    mixins: [commonCoach, nStringsMixin, commonCoreStrings],
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
