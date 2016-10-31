<template>

  <core-base>
    <main-nav slot="nav"></main-nav>
    <div v-if="!currentPage" slot="content"> <h1> Who likes short shorts? </h1> </div>
    <component slot="content" :is="currentPage" class="page"></component>
  </core-base>

</template>


<script>

  const store = require('../state/store');
  const constants = require('../state/constants');


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
      },
    },
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
