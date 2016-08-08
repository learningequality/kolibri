<template>

  <core-base>
    <main-nav slot="nav"></main-nav>
    <div slot="above">
      <top-nav v-if="isAdmin"></top-nav>
    </div>
    <component v-if="isAdmin" slot="content" :is="currentPage"></component>
    <div v-else slot="content">
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

    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        isAdmin: state => state.core.session.kind === UserKinds.ADMIN,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  h1, h3
    text-align: center
  h1
    margin-top: 200px

</style>
