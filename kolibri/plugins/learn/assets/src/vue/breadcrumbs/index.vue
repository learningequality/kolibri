<template>

  <div>
    <nav class="nav" role="navigation" :aria-label="$tr('youAreHere')">

      <span v-if="pageName === PageNames.LEARN_CONTENT">
        <a v-link="learnRootLink">
          <span class="visuallyhidden">{{ $tr('back') }}</span>
          <svg role="presentation" src="../icons/folder_back.svg"></svg>
          {{ text }}
        </a>
      </span>

      <span v-if="pageName === PageNames.EXPLORE_CONTENT">
        <a v-link="parentExploreLink">
          <span class="visuallyhidden">{{ $tr('back') }}</span>
          <svg role="presentation" src="../icons/folder_back.svg"></svg>
          {{ text }}
        </a>
      </span>

      <span v-if="pageName === PageNames.EXPLORE_TOPIC">

        <span class="first-breadcrumb landscape">
          <a v-link="exploreRootLink">{{ $tr('explore') }}</a>
        </span>

        <span class="portrait">
          <a v-link="parentExploreLink">
            <span class="visuallyhidden">{{ $tr('back') }}</span>
            <svg role="presentation" src="../icons/folder_back.svg"></svg>
            {{ text }}
          </a>
        </span>

        <span class="middle-breadcrumb landscape" v-for="crumb in topicCrumbs">
          <a v-link="topicLink(crumb.id)">{{ crumb.title }}</a>
        </span>

        <span class="middle-breadcrumb landscape">
          {{ title }}
        </span>

      </span>

    </nav>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;
  const PageModes = require('../../state/constants').PageModes;
  const getters = require('../../state/getters');

  module.exports = {
    $trNameSpace: 'learn',
    $trs: {
      explore: 'Explore',
      youAreHere: 'You are here:',
      back: 'Back to previous topic',
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
          channel: this.currentChannelId,
        };
      },
      exploreRootLink() {
        return {
          name: PageNames.EXPLORE_CHANNEL,
          channel: this.currentChannelId,
        };
      },
      parentExploreLink() {
        let breadcrumbs = [];
        if (this.pageName === PageNames.EXPLORE_CONTENT) {
          breadcrumbs = this.contentCrumbs;
        } else if (this.pageName === PageNames.EXPLORE_TOPIC) {
          breadcrumbs = this.topicCrumbs;
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
            channel: this.currentChannelId,
            id: topicId,
          },
        };
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        topicCrumbs: state => state.pageState.topic.breadcrumbs,
        contentCrumbs: state => state.pageState.content.breadcrumbs,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        currentChannelId: state => state.currentChannelId,
        title: state => state.pageState.topic.title,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'
  @require '../learn.styl'

  .nav
    margin-top: 2em
    margin-bottom:1.5em

  .middle-breadcrumb::before
    content: '>'
    margin-left: 0.5em
    margin-right: 0.5em
    color: $core-text-annotation

  .middle-breadcrumb, .first-breadcrumb
    vertical-align: middle
    font-size: 0.9em
    font-weight: 300
    max-width: 140px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    a
      color: $core-text-annotation
      display: inline-block

  .landscape
    @media screen and (max-width: $portrait-breakpoint)
      display: none

  .portrait
    display: none
    @media screen and (max-width: $portrait-breakpoint)
      display: initial

  svg
    fill: $core-text-annotation

</style>
