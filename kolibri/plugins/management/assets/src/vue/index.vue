<template>

  <core-base>
    <main-nav slot="nav"></main-nav>
    <div slot="above">
        <top-nav></top-nav>
        <login-modal></login-modal>
    </div>
    <component slot="content" :is="currentPage"></component>
  </core-base>

</template>


<script>

  const store = require('../state/store');
  const PageNames = require('../state/constants').PageNames;

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'top-nav': require('./top-nav'),
      'main-nav': require('./main-nav'),
      'user-page': require('./user-page'),
      'data-page': require('./data-page'),
      'content-page': require('./content-page'),
      'login-modal': require('./login-modal.vue'),
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
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped></style>
