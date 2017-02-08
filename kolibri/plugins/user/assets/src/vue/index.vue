<template>

  <core-base :topLevelPageName="topLevelPageName">
    <component
      slot="content"
      class="user page"
      :is="currentPage"
    />
  </core-base>

</template>


<script>

  const store = require('../state/store');
  const PageNames = require('../state/constants').PageNames;
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

  module.exports = {
    components: {
      'scratchpad-page': require('./scratchpad-page'),
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.USER,
      currentPage() {
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
