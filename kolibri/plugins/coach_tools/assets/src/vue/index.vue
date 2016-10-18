<template>

  <core-base>
    <main-nav slot="nav"></main-nav>
    <div slot="content"> <h1> Who likes short shorts? </h1> </div>
    <component slot="content" :is="currentPage" class="page"></component>
  </core-base>

</template>


<script>

  const store = require('../state/store');

  module.exports = {
    components: {
      'main-nav': require('./main-nav'),
      'scratchpad-page': require('./scratchpad-page'),
    },
    computed: {
      currentPage() {
        if (this.pageName === 'SCRATCHPAD') {
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
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

</style>
