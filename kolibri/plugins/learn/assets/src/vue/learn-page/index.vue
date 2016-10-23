<template>

  <div>
    <page-header :title="learnName">
      <svg slot="icon" class="pageicon" src="../icons/learn.svg"></svg>
    </page-header>
    <card-grid :header="'All Content'" v-if="allContent.length">
      <content-grid-item
        v-for="content in allContent"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.id">
      </content-grid-item>
    </card-grid>
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
    computed: {
      learnName() {
        return this.$tr('learnName');
      },
    },
    components: {
      'page-header': require('../page-header'),
      'expandable-content-grid': require('../expandable-content-grid'),
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        allContent: state => state.pageState.allContent,
        recommendations: state => state.pageState.recommendations,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
