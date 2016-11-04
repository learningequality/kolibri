<template>

  <core-base>
    <main-nav slot="nav"></main-nav>

    <template v-if="isAdminOrSuperuser">
      <div class="manage-content" slot="above">
        <top-nav></top-nav>
      </div>
      <component slot="content" :is="currentPage" class="manage-content page"></component>
    </template>
    <div v-else slot="content" class="login-message">
      <h1>Did you forget to log in?</h1>
      <p>You must be logged in as an Admin to view this page.</p>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const PageNames = require('../state/constants').PageNames;
  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;

  module.exports = {
    components: {
      'top-nav': require('./top-nav'),
      'main-nav': require('./main-nav'),
      'user-page': require('./user-page'),
      'data-page': require('./data-page'),
      'manage-content-page': require('./manage-content-page'),
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
          return 'manage-content-page';
        }
        if (this.pageName === PageNames.SCRATCHPAD) {
          return 'scratchpad-page';
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
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

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
    margin-top: 2em
    border-radius: $radius

  .login-message
    text-align: center
    margin-top: 200px

</style>
