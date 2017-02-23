<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('learnTitle')">
    <div slot="app-bar-actions">
      <channel-switcher @switch="switchChannel"/>
      <ui-icon-button
        icon="search"
        type="secondary"
        color="white"
        :ariaLabel="$tr('search')"
        @click="routeToSearchPage"/>
    </div>
    <div slot="tabs" v-if="!isSearchPage">
      <section-nav/>
    </div>
    <div slot="content">
      <breadcrumbs/>
      <component :is="currentPage"/>
    </div>

  </core-base>

</template>


<script>

  const constants = require('../state/constants');
  const PageNames = constants.PageNames;
  const PageModes = constants.PageModes;
  const getters = require('../state/getters');
  const store = require('../state/store');
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

  module.exports = {
    $trNameSpace: 'learn',
    $trs: {
      learnTitle: 'Learn',
      search: 'search',
    },
    components: {
      'explore-page': require('./explore-page'),
      'content-page': require('./content-page'),
      'learn-page': require('./learn-page'),
      'scratchpad-page': require('./scratchpad-page'),
      'content-unavailable-page': require('./content-unavailable-page'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'channel-switcher': require('kolibri.coreVue.components.channelSwitcher'),
      'breadcrumbs': require('./breadcrumbs'),
      'section-nav': require('./section-nav'),
      'search-page': require('./search-page'),
    },
    methods: {
      routeToSearchPage() {
        this.$router.replace({
          name: constants.PageNames.SEARCH,
          params: { channel_id: this.currentChannelId },
        });
      },
      switchChannel(channelId) {
        let rootPage;
        if (this.pageMode === constants.PageModes.EXPLORE) {
          rootPage = constants.PageNames.EXPLORE_CHANNEL;
        } else {
          rootPage = constants.PageNames.LEARN_CHANNEL;
        }
        this.clearSearch();
        this.$router.push({
          name: rootPage,
          params: { channel_id: channelId },
        });
      },
    },
    computed: {
      topLevelPageName() {
        return TopLevelPageNames.LEARN;
      },
      currentPage() {
        if (this.pageName === PageNames.EXPLORE_CHANNEL ||
          this.pageName === PageNames.EXPLORE_TOPIC) {
          return 'explore-page';
        }
        if (this.pageName === PageNames.EXPLORE_CONTENT ||
          this.pageName === PageNames.LEARN_CONTENT) {
          return 'content-page';
        }
        if (this.pageName === PageNames.LEARN_CHANNEL) {
          return 'learn-page';
        }
        if (this.pageName === PageNames.SCRATCHPAD) {
          return 'scratchpad-page';
        }
        if (this.pageName === PageNames.CONTENT_UNAVAILABLE) {
          return 'content-unavailable-page';
        }
        if (this.pageName === PageNames.SEARCH) {
          return 'search-page';
        }
        return null;
      },
      isSearchPage() {
        return this.pageName === PageNames.SEARCH;
      },
      exploreMode() {
        return this.pageMode === PageModes.EXPLORE;
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        pageName: state => state.pageName,
        currentChannelId: state => state.core.channels.currentId,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require 'learn.styl'

  .content
    margin: auto

</style>
