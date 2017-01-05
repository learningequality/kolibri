<template>

  <core-base>
    <main-nav slot="nav"/>

    <div v-if="!currentPage && isAdminOrSuperuser" slot="content">
      <h1>Coach Root</h1>
      <a href="/coach/#/reports">Go to Reports.</a>
    </div>
    <component v-if="isAdminOrSuperuser" slot="content" :is="currentPage" class="page"/>

    <div v-else slot="content" class="login-message">
      <h1>{{ $tr('logInPrompt') }}</h1>
      <p>{{ $tr('logInCommand') }}</p>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const constants = require('../state/constants');
  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;

  module.exports = {
    $trNameSpace: 'coach-root',
    $trs: {
      logInPrompt: 'Did you forget to log in?',
      logInCommand: 'You must be logged in as an Admin to view this page.',
    },
    components: {
      'main-nav': require('./main-nav'),
      'reports': require('./reports'),
    },
    computed: {
      currentPage() {
        if (this.pageName === constants.PageNames.REPORTS) {
          return 'reports';
        }
        return null;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        isAdminOrSuperuser,
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
