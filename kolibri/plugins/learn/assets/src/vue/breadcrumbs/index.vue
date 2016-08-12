<template>

  <div>
    <nav class="nav" role="navigation" aria-label="You are here:">
      <span class="learn-bread" v-if="pageName === allPageNames.LEARN_CONTENT">
        <first-bread :breadlink="learnRoot" breadtext="Learn"></first-bread>
      </span>

      <span class="explore-bread" v-if="!isRoot && pageName === allPageNames.EXPLORE_CHANNEL">
        <first-bread :showarrow='false' :breadlink="exploreRoot" breadtext="Explore"></first-bread>
      </span>

      <span class="portrait-only" v-if="!isRoot && pageName === allPageNames.EXPLORE_CHANNEL">
        <first-bread :breadlink="portraitOnlyParentLink"></first-bread>
      </span>

      <span v-if="pageName === allPageNames.EXPLORE_CONTENT">
        <first-bread :breadlink="parentLink"></first-bread>
      </span>

      <span class="middle-bread explore-bread" v-if="pageMode === allPageModes.EXPLORE" v-for="crumb in crumbs">
        <a v-link="crumbLink(crumb.id)">{{ crumb.title }}</a>
      </span>
    </nav>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;
  const PageModes = require('../../state/constants').PageModes;
  const getters = require('../../state/getters');

  module.exports = {
    components: {
      'first-bread': require('./first-bread'),
    },
    computed: {
      allPageModes() {
        return PageModes;
      },
      allPageNames() {
        return PageNames;
      },
      learnRoot() {
        return { name: PageNames.LEARN_ROOT };
      },
      exploreRoot() {
        return { name: PageNames.EXPLORE_ROOT };
      },
      parentLink() {
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
      portraitOnlyParentLink() {
        if (this.pageState.topic) {
          const bread = this.pageState.topic.breadcrumbs;
          if (bread[bread.length - 1]) {
            const id = bread[bread.length - 1].id;
            return {
              name: PageNames.EXPLORE_TOPIC,
              params: { id },
            };
          }
        }
        return { name: PageNames.EXPLORE_ROOT };
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
  @require '../learn.styl'

  .nav
    margin-top: 2em
    margin-bottom:1.4em

  .middle-bread:before
    content: '>'
    margin-left: 0.5em
    margin-right: 0.5em
    color: $core-text-annotation

  a
    display: inline-block
    vertical-align: middle
    margin-bottom: 2px
    font-size: 0.9em
    font-weight: 300
    max-width: 140px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    color: $core-text-annotation

  .explore-bread
    @media screen and (max-width: $portrait-breakpoint)
      display: none

  .portrait-only
    display: none
    @media screen and (max-width: $portrait-breakpoint)
      display: initial

</style>
