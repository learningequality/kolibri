<template>

  <div>
    <nav class="nav" role="navigation" aria-label="You are here:">
      <span class="learn-bread" v-if="pageName === PageNames.LEARN_CONTENT">
        <breadcrumb :linkobject="learnRootLink" text="Learn"></breadcrumb>
      </span>

      <template v-if="pageName === PageNames.EXPLORE_TOPIC">
        <span class="landscape">
          <breadcrumb :showarrow='false' :linkobject="exploreRootLink" text="Explore"></breadcrumb>
        </span>
        <span class="portrait">
          <breadcrumb :linkobject="portraitOnlyParentLink"></breadcrumb>
        </span>
      </template>

      <span v-if="pageName === PageNames.EXPLORE_CONTENT">
        <breadcrumb :linkobject="parentLink"></breadcrumb>
      </span>

      <span class="middle-bread explore-bread" v-if="pageMode === PageModes.EXPLORE" v-for="crumb in crumbs">
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
      breadcrumb: require('./breadcrumb'),
    },
    computed: {
      PageModes() {
        return PageModes;
      },
      PageNames() {
        return PageNames;
      },
      learnRootLink() {
        return { name: PageNames.LEARN_ROOT };
      },
      exploreRootLink() {
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

  .landscape
    @media screen and (max-width: $portrait-breakpoint)
      display: none

  .portrait
    display: none
    @media screen and (max-width: $portrait-breakpoint)
      display: initial

</style>
