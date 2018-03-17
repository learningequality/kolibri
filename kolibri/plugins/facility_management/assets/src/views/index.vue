<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('facilityTitle')">

    <div v-if="isAdmin || isSuperuser">
      <div class="facility-management">
        <top-nav />
        <component :is="currentPage" />
      </div>
    </div>

    <auth-message v-else :details="$tr('adminOrSuperuser')" />

  </core-base>

</template>


<script>

  import { PageNames } from '../constants';
  import { isAdmin, isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  const pageNameComponentMap = {
    [PageNames.CLASS_EDIT_MGMT_PAGE]: 'class-edit-page',
    [PageNames.CLASS_ENROLL_MGMT_PAGE]: 'class-enroll-page',
    [PageNames.CLASS_MGMT_PAGE]: 'manage-class-page',
    [PageNames.DATA_EXPORT_PAGE]: 'data-page',
    [PageNames.FACILITY_CONFIG_PAGE]: 'facilities-config-page',
    [PageNames.USER_MGMT_PAGE]: 'user-page',
  };
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import classEditPage from './class-edit-page';
  import classEnrollPage from './class-enroll-page';
  import coachClassAssignmentPage from './coach-class-assignment-page';
  import learnerClassEnrollmentPage from './learner-class-enrollment-page';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import dataPage from './data-page';
  import facilitiesConfigPage from './facilities-config-page';
  import manageClassPage from './manage-class-page';
  import topNav from './top-nav';
  import userPage from './user-page';
  export default {
    $trs: {
      facilityTitle: 'Facility',
      adminOrSuperuser: 'You must be signed in as an admin or superuser to view this page',
      // here because going to use immersive-page
      detailPageReturnPrompt: 'Class details',
    },
    name: 'managementRoot',
    components: {
      authMessage,
      classEditPage,
      classEnrollPage,
      coachClassAssignmentPage,
      learnerClassEnrollmentPage,
      coreBase,
      dataPage,
      facilitiesConfigPage,
      manageClassPage,
      topNav,
      userPage,
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.MANAGE,
      currentPage() {
        return pageNameComponentMap[this.pageName] || null;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        isAdmin,
        isSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
