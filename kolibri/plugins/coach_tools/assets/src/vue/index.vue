<template>

  <core-base :topLevelPageName="topLevelPageName">
    <div v-if="!currentPage && isCoachAdminOrSuperuser" slot="content">
      <h1>Coach Root</h1>
      <a href="/coach/#/reports">Go to Reports.</a>
    </div>
    <component v-if="isCoachAdminOrSuperuser" slot="content" :is="currentPage" class="page"/>

    <div v-else slot="content" class="login-message">
      <h1>{{ $tr('logInPrompt') }}</h1>
      <p>{{ $tr('logInCommand') }}</p>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const constants = require('../state/constants');
  const isCoachAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isCoachAdminOrSuperuser;
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

  module.exports = {
    $trNameSpace: 'coach-root',
    $trs: {
      logInPrompt: 'Did you forget to log in?',
      logInCommand: 'You must be logged in as an Admin to view this page.',
    },
    components: {
      'reports': require('./reports'),
      'content-unavailable-page': require('./content-unavailable-page'),
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
        if (this.pageName === constants.PageNames.REPORTS) {
          return 'reports';
        }
        if (this.pageName === constants.PageNames.CONTENT_UNAVAILABLE) {
          return 'content-unavailable-page';
        }
        return null;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        isCoachAdminOrSuperuser,
      },
    },
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .login-message
    text-align: center
    margin-top: 200px

</style>
