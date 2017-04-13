<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('managementTitle')">

    <div v-if="isAdminOrSuperuser" slot="content">
      <div class="manage-content">
        <top-nav/>
      </div>
      <component class="manage-content page" :is="currentPage"/>
    </div>

    <div v-else slot="content" class="login-message">
      <h1>{{ $tr('logInPrompt') }}</h1>
      <p>{{ $tr('logInCommand') }}</p>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const PageNames = require('../constants').PageNames;
  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

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

  module.exports = {
    $trNameSpace: 'managementRoot',
    $trs: {
      managementTitle: 'Management',
      logInPrompt: 'Did you forget to log in?',
      logInCommand: 'You must be logged in as an Admin to view this page.',
    },
    components: {
      'class-edit-page': require('./class-edit-page'),
      'class-enroll-page': require('./class-enroll-page'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'data-page': require('./data-page'),
      'facilities-config-page': require('./facilities-config-page'),
      'manage-class-page': require('./manage-class-page'),
      'manage-content-page': require('./manage-content-page'),
      'scratchpad-page': require('./scratchpad-page'),
      'top-nav': require('./top-nav'),
      'user-page': require('./user-page'),
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
        isAdminOrSuperuser,
      },
    },
    store, // make this and all child components aware of the store
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

  .login-message
    text-align: center
    margin-top: 200px

</style>
