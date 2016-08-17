<template>

  <core-base>
    <main-nav slot="nav"></main-nav>
<!-- // disable log downloading until we track down some issues
    <div v-if="isAdminOrSuperuser" slot="above">
      <top-nav></top-nav>
    </div>
-->
    <component v-if="isAdminOrSuperuser" slot="content" :is="currentPage" class="page"></component>
    <div v-else slot="content" class="login-message">
      <h1>Did you forget to log in?</h1>
      <h3>You must be logged in as an Admin to view this page.</h3>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const PageNames = require('../state/constants').PageNames;
  const UserKinds = require('kolibri').constants.UserKinds;

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'top-nav': require('./top-nav'),
      'main-nav': require('./main-nav'),
      'user-page': require('./user-page'),
      'data-page': require('./data-page'),
      'content-page': require('./content-page'),
      'scratchpad-page': require('./scratchpad-page'),
    },
    computed: {
      currentPage() {
        if (this.pageName === PageNames.USER_MGMT_PAGE) {
          return 'user-page';
        }
        if (this.pageName === PageNames.DATA_EXPORT_PAGE) {
          return 'data-page';
        }
        if (this.pageName === PageNames.CONTENT_MGMT_PAGE) {
          return 'content-page';
        }
        if (this.pageName === PageNames.SCRATCHPAD) {
          return 'scratchpad-page';
        }
        return null;
      },
      isAdminOrSuperuser() {
        if (this.kind[0] === UserKinds.SUPERUSER || this.kind[0] === UserKinds.ADMIN) {
          return true;
        }
        return false;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        kind: state => state.core.session.kind,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .page
    padding: 1em 2em
    padding-bottom: 3em
    background-color: $core-bg-light
    margin-top: 2em
    width: 100%
    border-radius: $radius

  .login-message h1, h3
    text-align: center
  .login-message h1
    margin-top: 200px

</style>
