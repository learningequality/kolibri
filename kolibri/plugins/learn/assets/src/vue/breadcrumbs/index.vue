<template>

  <div>
    <nav class="nav" role="navigation" aria-label="You are here:">
      <span class="parent full-breadcrumbs" v-if="pageMode === $options.PageModes.EXPLORE && pageName !== $options.PageNames.EXPLORE_CONTENT && !isRoot">
        <a v-link="exploreRoot">Explore</a><span class='sep'>&#62</span>
      </span>
      <span class="parent" v-if="pageName === $options.PageNames.LEARN_CONTENT">
        <a v-link="learnRoot">
          <span class='sep'>
            <svg height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h24v24H0z" fill="none"></path>
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
            </svg>
          Learn
          </span>
        </a>
      </span>
      <span class="parent" v-if="pageName === $options.PageNames.EXPLORE_CONTENT">
        <a v-link="parentLink">
          <span class='sep'>
            <svg height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h24v24H0z" fill="none"></path>
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
            </svg>
          Back
          </span>
        </a>
      </span>
      <span class="parent full-breadcrumbs" v-if="pageMode === $options.PageModes.EXPLORE" v-for="crumb in crumbs">
        <a v-link="crumbLink(crumb.id)">{{ crumb.title }}</a><span class='sep'>&#62</span>
      </span>
      <span class="back" v-if="!isRoot && pageMode === $options.PageModes.EXPLORE && pageName !== $options.PageNames.EXPLORE_CONTENT">
        <a v-link="backLink">
          <span class='sep'>
            <svg height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h24v24H0z" fill="none"></path>
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
            </svg>
          Back
          </span>
        </a>
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
        let bread;
        let id;
        if (this.pageState.topic) {
          bread = this.pageState.topic.breadcrumbs;
          if (bread[bread.length - 1]) {
            id = bread[bread.length - 1].id;
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
  a
    display: inline-block
    vertical-align: middle
    margin-bottom: 2px
    font-weight: 300
    max-width: 140px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
  svg
    vertical-align: middle
    fill: $core-action-normal
    margin-bottom: 2px
  .full-breadcrumbs
    @media screen and (max-width: $portrait-breakpoint)
      display: none
  .back
    display: none
    @media screen and (max-width: $portrait-breakpoint)
      display: initial

</style>
