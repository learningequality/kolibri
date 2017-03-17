<template>

  <div>
    <nav class="breadcrumbs" role="navigation" :aria-label="$tr('youAreHere')">

      <span v-if="pageName === PageNames.LEARN_CONTENT">
        <router-link :to="learnRootLink">
          <span class="visuallyhidden">{{ $tr('back') }}</span>
          <mat-svg category="navigation" name="arrow_back"/>
        </router-link>
      </span>

      <span v-if="pageName === PageNames.EXPLORE_CONTENT">
        <router-link :to="parentExploreLink">
          <span class="visuallyhidden">{{ $tr('back') }}</span>
          <mat-svg category="navigation" name="arrow_back"/>
        </router-link>
      </span>

      <span v-if="pageName === PageNames.EXPLORE_TOPIC">

        <span class="first-breadcrumb landscape">
          <router-link :to="exploreRootLink">{{ $tr('explore') }}</router-link>
        </span>

        <span class="portrait">
          <router-link :to="parentExploreLink">
            <span class="visuallyhidden">{{ $tr('back') }}</span>
            <mat-svg category="navigation" name="arrow_back"/>
          </router-link>
        </span>

        <span class="middle-breadcrumb landscape" v-for="crumb in topicCrumbs">
          <router-link :to="topicLink(crumb.id)">{{ crumb.title }}</router-link>
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
      explore: 'Topics',
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
          channel_id: this.currentChannelId,
        };
      },
      exploreRootLink() {
        return {
          name: PageNames.EXPLORE_CHANNEL,
          channel_id: this.currentChannelId,
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
            channel_id: this.currentChannelId,
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
        currentChannelId: state => state.core.channels.currentId,
        title: state => state.pageState.topic.title,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require '../learn.styl'

  .middle-breadcrumb::before
    margin-right: 0.5em
    margin-left: 0.5em
    color: $core-text-annotation
    content: '>'

  .middle-breadcrumb, .first-breadcrumb
    overflow: hidden
    max-width: 140px
    vertical-align: middle
    text-overflow: ellipsis
    white-space: nowrap
    font-weight: 300
    font-size: 0.9em
    a
      display: inline-block
      color: $core-text-annotation

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
