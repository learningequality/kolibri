<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('learnTitle')">
    <div slot="app-bar-actions">
      <channel-switcher @switch="switchChannel"/>
      <router-link :to="searchPage">
        <ui-icon-button
          icon="search"
          type="secondary"
          color="white"
          :ariaLabel="$tr('search')"/>
      </router-link>
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
      switchChannel(channelId) {
        if (this.pageName === constants.PageNames.SEARCH) {
          this.$router.replace({
            name: constants.PageNames.SEARCH,
            params: { channel_id: channelId },
            query: { query: this.searchTerm },
          });
        } else if (this.pageName === constants.PageNames.LEARN_CHANNEL) {
          this.$router.push({
            name: constants.PageNames.LEARN_CHANNEL,
            params: { channel_id: channelId },
          });
        } else {
          this.$router.push({
            name: constants.PageNames.EXPLORE_CHANNEL,
            params: { channel_id: channelId },
          });
        }
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
      searchPage() {
        return { name: PageNames.SEARCH_ROOT };
      },
      isSearchPage() {
        return this.pageName === PageNames.SEARCH;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        searchTerm: state => state.pageState.searchState.searchTerm,
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
