<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <p>
        <BackLink
          :to="classRoute('HomePage', {})"
          :text="$tr('back')"
        />
      </p>

      <ActivityList
        :notificationParams="notificationParams"
        :noActivityString="$tr('noActivityLabel')"
        embeddedPageName="HomeActivityPage"
      />

    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import { nStringsMixin } from '../common/notifications/notificationStrings';
  import ActivityList from '../common/notifications/ActivityList';

  export default {
    name: 'HomeActivityPage',
    components: {
      ActivityList,
    },
    mixins: [commonCoach, nStringsMixin],
    computed: {
      notificationParams() {
        return {
          collection_id: this.$route.params.classId,
        };
      },
    },
    $trs: {
      back: 'Class home',
      noActivityLabel: 'No activity in your class',
    },
  };

</script>


<style lang="scss" scoped>

  .show-more {
    height: 100px;
  }

</style>
