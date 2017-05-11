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
      <a class="points-link" href="/user"><total-points/></a>
    </div>

    <div v-if="!isSearchPage">
      <tabs>
        <tab-link
          :title="$tr('recommended')"
          icon="forum"
          :link="recommendedLink"
          :selected="inRecommended"
        />
        <tab-link
          :title="$tr('topics')"
          icon="folder"
          :link="topicsLink"
          :selected="inTopics"
        />
        <tab-link
          v-if="isUserLoggedIn && userHasMemberships"
          :title="$tr('exams')"
          icon="assignments"
          :link="examsLink"
          :selected="inExams"
        />
      </tabs>
    </div>

    <div>
      <breadcrumbs/>
      <component :is="currentPage"/>
    </div>

  </core-base>

</template>


<script>

  const getters = require('../state/getters');
  const store = require('../state/store');
  const { PageNames, PageModes } = require('../constants');
  const { TopLevelPageNames } = require('kolibri.coreVue.vuex.constants');
  const { isUserLoggedIn } = require('kolibri.coreVue.vuex.getters');

  module.exports = {
    $trNameSpace: 'learn',
    $trs: {
      learnTitle: 'Learn',
      recommended: 'Recommended',
      topics: 'Topics',
      search: 'search',
      exams: 'Exams'
    },
    components: {
      'explore-page': require('./explore-page'),
      'content-page': require('./content-page'),
      'learn-page': require('./learn-page'),
      'scratchpad-page': require('./scratchpad-page'),
      'content-unavailable-page': require('./content-unavailable-page'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'channel-switcher': require('./channel-switcher'),
      'breadcrumbs': require('./breadcrumbs'),
      'search-page': require('./search-page'),
      'tabs': require('kolibri.coreVue.components.tabs'),
      'tab-link': require('kolibri.coreVue.components.tabLink'),
      'exam-list': require('./exam-list'),
      'exam-page': require('./exam-page'),
      'total-points': require('./total-points'),
    },
    methods: {
      switchChannel(channelId) {
        let page;
        switch (this.pageMode) {
          case PageModes.SEARCH:
            page = PageNames.SEARCH;
            if (this.searchTerm) {
              this.$router.push({
                name: page,
                params: { channel_id: channelId },
                query: { query: this.searchTerm },
              });
              return;
            }
            break;

          case PageModes.LEARN:
            page = PageNames.LEARN_CHANNEL;
            break;

          case PageModes.EXAM:
            page = PageNames.EXAM_LIST;
            break;

          default:
            page = PageNames.EXPLORE_CHANNEL;
        }

        this.$router.push({
          name: page,
          params: { channel_id: channelId },
        });
      },
    },
    computed: {
      topLevelPageName() {
        return TopLevelPageNames.LEARN;
      },
      userHasMemberships() {
        return this.memberships.length > 0;
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
        if (this.pageName === PageNames.EXAM_LIST) {
          return 'exam-list';
        }
        if (this.pageName === PageNames.EXAM) {
          return 'exam-page';
        }
        return null;
      },
      searchPage() {
        return { name: PageNames.SEARCH_ROOT };
      },
      isSearchPage() {
        return this.pageName === PageNames.SEARCH;
      },
      recommendedLink() {
        return { name: PageNames.LEARN_CHANNEL, params: { channel_id: this.channelId } };
      },
      topicsLink() {
        return { name: PageNames.EXPLORE_CHANNEL, params: { channel_id: this.channelId } };
      },
      examsLink() {
        return { name: PageNames.EXAM_LIST, params: { channel_id: this.channelId } };
      },
      inRecommended() {
        return this.pageMode === PageModes.LEARN;
      },
      inTopics() {
        return this.pageMode === PageModes.EXPLORE;
      },
      inExams() {
        return this.pageMode === PageModes.EXAM;
      },
    },
    vuex: {
      getters: {
        memberships: state => state.learnAppState.memberships,
        pageMode: getters.pageMode,
        pageName: state => state.pageName,
        searchTerm: state => state.pageState.searchTerm,
        isUserLoggedIn,
        channelId: state => state.core.channels.currentId,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require 'learn.styl'
  @require '~kolibri.styles.definitions'

  .content
    margin: auto

  .points-link
    color: inherit

</style>
