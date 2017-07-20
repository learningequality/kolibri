<template>

  <div>
    <page-header :title="$tr('learnName')">
      <mat-svg slot="icon" category="action" name="home"/>
    </page-header>
    <allcontent v-if="all.content.length"/>
    <expandable-content-grid
      :contents="recommendations.popular"
      :title="$tr('mostPopular')"/>
    <expandable-content-grid
      :contents="recommendations.nextSteps"
      :title="$tr('nextSteps')"/>
    <expandable-content-grid
      :contents="recommendations.resume"
      :title="$tr('resume')"/>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'learnIndex',
    $trs: {
      learnName: 'Recommended',
      mostPopular: 'Most popular',
      nextSteps: 'Next steps',
      resume: 'Resume',
    },
    components: {
      'page-header': require('../page-header'),
      'allcontent': require('./allcontent'),
      'expandable-content-grid': require('../expandable-content-grid'),
    },
    vuex: {
      getters: {
        all: state => state.pageState.all,
        recommendations: state => state.pageState.recommendations,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
