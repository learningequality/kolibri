<template>

  <core-base>
    <main-nav slot="nav"></main-nav>

    <template v-if="isAdminOrSuperuser">
      <div v-if="!currentPage" slot="content">
        <h1>Coach Root</h1>
        <a href="/coach/#!/reports">Go to Reports.</a>
      </div>
      <component slot="content" :is="currentPage" class="page"></component>
    </template>

    <div v-else slot="content" class="login-message">
      <h1>Did you forget to log in?</h1>
      <p>You must be logged in as an Admin to view this page.</p>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const constants = require('../state/constants');
  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;

  module.exports = {
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
