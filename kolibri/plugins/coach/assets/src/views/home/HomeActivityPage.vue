<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <template #sub-nav>
      <TopNavbar />
    </template>

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
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { nStringsMixin } from '../common/notifications/notificationStrings';
  import ActivityList from '../common/notifications/ActivityList';

  export default {
    name: 'HomeActivityPage',
    components: {
      ActivityList,
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
