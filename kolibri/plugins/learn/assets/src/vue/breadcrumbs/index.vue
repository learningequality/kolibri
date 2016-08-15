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
          <breadcrumb :linkobject="parentExploreLink"></breadcrumb>
        </span>
        <span class="middle-breadcrumb landscape" v-for="crumb in topicCrumbs">
          <a v-link="topicLink(crumb.id)">{{ crumb.title }}</a>
        </span>
      </template>

      <span v-if="pageName === PageNames.EXPLORE_CONTENT">
        <breadcrumb :linkobject="parentExploreLink"></breadcrumb>
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
        return {
          name: PageNames.LEARN_CHANNEL,
          channel: this.currentChannel,
        };
      },
      exploreRootLink() {
        return {
          name: PageNames.EXPLORE_CHANNEL,
          channel: this.currentChannel,
        };
      },
      parentExploreLink() {
        let breadcrumbs = [];
        if (this.pageName === PageNames.EXPLORE_CONTENT) {
          breadcrumbs = this.pageState.content.breadcrumbs;
        } else if (this.pageName === PageNames.EXPLORE_TOPIC) {
          breadcrumbs = this.pageState.topic.breadcrumbs;
        }
        if (breadcrumbs.length) {
          return this.topicLink(breadcrumbs[breadcrumbs.length - 1].id);
        }
        return this.exploreRootLink;
      },
    },
    methods: {
      topicLink(topicId) {
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: {
            channel: this.currentChannel,
            id: topicId,
          },
        };
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        topicCrumbs: state => state.pageState.topic.breadcrumbs,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        currentChannel: state => state.currentChannel,
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

  .middle-breadcrumb:before
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
