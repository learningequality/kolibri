<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('managementTitle')">

    <div v-if="isAdmin || isSuperuser">
      <div class="manage-content">
        <top-nav/>
      </div>
      <component class="manage-content page" :is="currentPage"/>
    </div>

    <auth-message v-else authorizedRole="admin" />

  </core-base>

</template>


<script>

  import store from '../state/store';
  import { PageNames } from '../constants';
  import * as getters from 'kolibri.coreVue.vuex.getters';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  const pageNameComponentMap = {
    [PageNames.CLASS_EDIT_MGMT_PAGE]: 'class-edit-page',
    [PageNames.CLASS_ENROLL_MGMT_PAGE]: 'class-enroll-page',
    [PageNames.CLASS_MGMT_PAGE]: 'manage-class-page',
    [PageNames.CONTENT_MGMT_PAGE]: 'manage-content-page',
    [PageNames.DATA_EXPORT_PAGE]: 'data-page',
    [PageNames.FACILITY_CONFIG_PAGE]: 'facilities-config-page',
    [PageNames.SCRATCHPAD]: 'scratchpad-page',
    [PageNames.USER_MGMT_PAGE]: 'user-page',
  };
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import classEditPage from './class-edit-page';
  import classEnrollPage from './class-enroll-page';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import dataPage from './data-page';
  import facilitiesConfigPage from './facilities-config-page';
  import manageClassPage from './manage-class-page';
  import manageContentPage from './manage-content-page';
  import scratchpadPage from './scratchpad-page';
  import topNav from './top-nav';
  import userPage from './user-page';
  export default {
    $trNameSpace: 'managementRoot',
    $trs: { managementTitle: 'Manage' },
    components: {
      authMessage,
      classEditPage,
      classEnrollPage,
      coreBase,
      dataPage,
      facilitiesConfigPage,
      manageClassPage,
      manageContentPage,
      scratchpadPage,
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
        isAdmin: getters.isAdmin,
        isSuperuser: getters.isSuperuser,
      },
    },
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .manage-content
    width: 100%
    @media screen and (max-width: $medium-breakpoint)
        width: 90%
        margin-left: auto
        margin-right: auto

  .page
    padding: 1em 2em
    padding-bottom: 3em
    background-color: $core-bg-light
    margin-top: 1em
    border-radius: $radius

</style>
