<template>

  <div>
    <nav class="nav" role="navigation" aria-label="Breadcrumbs navigation">
      <span class="parent" class="single" v-if="pageMode === $options.PageModes.EXPLORE && pageName !== $options.PageNames.EXPLORE_CONTENT && !isRoot">
        <a v-link="exploreRoot">Explore</a>
      </span>
      <span class="single" v-if="pageName === $options.PageNames.LEARN_CONTENT">
        <a v-link="learnRoot">Learn</a>
      </span>
      <span class="single" v-if="pageName === $options.PageNames.EXPLORE_CONTENT">
        <a v-link="contentLink">Back</a>
      </span>
      <span class="parent" v-if="pageMode === $options.PageModes.EXPLORE" v-for="crumb in crumbs">
        <a v-link="crumbLink(crumb.id)">{{ crumb.title }}</a>
      </span>
    </nav>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;
  const constants = require('../../state/constants');
  const getters = require('../../state/getters');

  module.exports = {
    mixins: [constants], // makes constants available in $options
    computed: {
      learnRoot() {
        return { name: PageNames.LEARN_ROOT };
      },
      exploreRoot() {
        return { name: PageNames.EXPLORE_ROOT };
      },
      contentLink() {
        let bread;
        let id;
        if (this.pageState.content) {
          bread = this.pageState.content.breadcrumbs;
          id = bread[bread.length - 1].id;
        }
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: { id },
        };
      },
    },
    methods: {
      crumbLink(id) {
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: { id },
        };
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        crumbs: state => (state.pageState.topic ? state.pageState.topic.breadcrumbs : null),
        isRoot: state => (state.pageState.topic ?
          state.pageState.topic.id === state.rootTopicId : false),
        pageName: state => state.pageName,
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  nav a
    color: $core-text-annotation
    vertical-align: middle
    font-size: 0.9em

  .parent a::after
    content: url('rightarrow.svg')
    position: relative
    top: 0.5em

  .single a::before
    content: url('back.svg')
    position: relative
    top: 0.5em

</style>
