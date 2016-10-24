<template>

  <div>
    <page-header :title="$tr('learnName')">
      <svg slot="icon" class="pageicon" src="../icons/learn.svg"></svg>
    </page-header>
    <allcontent></allcontent>
    <expandable-content-grid
      :contents="recommendations.popular"
      :title="'Most Popular'">
    </expandable-content-grid>
    <expandable-content-grid
      :contents="recommendations.nextSteps"
      :title="'Next Steps'">
    </expandable-content-grid>
    <expandable-content-grid
      :contents="recommendations.resume"
      :title="'Resume'">
    </expandable-content-grid>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'learnIndex',
    $trs: {
      learnName: 'Learn',
    },
    components: {
      'page-header': require('../page-header'),
      'allcontent': require('./allcontent'),
      'expandable-content-grid': require('../expandable-content-grid'),
    },
    vuex: {
      getters: {
        recommendations: state => state.pageState.recommendations,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
