<template>

  <div>
    <nav class="nav" role="navigation" aria-label="You are here:">
      <span class="parent full-breadcrumbs" v-if="pageMode === thePageMode.EXPLORE && pageName !== thePageNames.EXPLORE_CONTENT && !isRoot">
        <a v-link="exploreRoot">Explore</a>
      </span>
      <span v-if="pageName === thePageNames.LEARN_CONTENT">
        <a v-link="learnRoot">
          <span class='sep'>
            <svg role="presentation" src="../icons/back.svg"></svg>
          Learn
          </span>
        </a>
      </span>
      <span v-if="pageName === thePageNames.EXPLORE_CONTENT">
        <a v-link="parentLink">
          <span class='sep'>
            <svg role="presentation" src="../icons/back.svg"></svg>
          Back
          </span>
        </a>
      </span>
      <span class="parent full-breadcrumbs" v-if="pageMode === thePageMode.EXPLORE" v-for="crumb in crumbs">
        <a v-link="crumbLink(crumb.id)">{{ crumb.title }}</a>
      </span>
      <span class="back" v-if="!isRoot && pageMode === thePageMode.EXPLORE && pageName !== thePageNames.EXPLORE_CONTENT">
        <a v-link="backLink">
          <span class='sep'>
            <svg role="presentation" src="../icons/back.svg"></svg>
          Back
          </span>
        </a>
      </span>
    </nav>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;
  const PageModes = require('../../state/constants').PageModes;
  const getters = require('../../state/getters');

  module.exports = {

    computed: {
      thePageMode() {
        return PageModes;
      },
      thePageNames() {
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
      backLink() {
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

  .sep
    margin-left: 0.5em
    margin-right: 0.5em
  .nav
    margin-top: 2em
    margin-bottom:1.4em
  .parent:after
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
  svg
    vertical-align: middle
    fill: $core-text-annotation
    margin-bottom: 2px
  .full-breadcrumbs
    @media screen and (max-width: $portrait-breakpoint)
      display: none
  .back
    display: none
    @media screen and (max-width: $portrait-breakpoint)
      display: initial

</style>
