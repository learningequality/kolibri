<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('learnTitle')">
    <div slot="app-bar-actions">

      <form
        @submit.prevent="search"
        class="search-box">
        <input
          type="search"
          :placeholder="$tr('search')"
          v-model="searchQuery"
          class="search-input">
        <ui-icon-button
          :ariaLabel="$tr('clear')"
          icon="clear"
          color="black"
          class="search-clear-button"
          :class="searchQuery === '' ? '' : 'search-clear-button-visble'"
          @click="searchQuery = ''"
          size="small"
        />
        <div class="search-submit-button-wrapper">
          <ui-icon-button
            :ariaLabel="$tr('search')"
            icon="search"
            type="secondary"
            color="white"
            @click="search"
            class="search-submit-button"
          />
        </div>
      </form>

      <channel-switcher @switch="switchChannel"/>

      <a class="points-link" href="/user"><total-points/></a>
    </div>

    <div v-if="tabLinksAreVisible" class="tab-links">
      <tabs>
        <tab-link
          type="icon-and-title"
          :title="$tr('recommended')"
          icon="forum"
          :link="recommendedLink"
        />
        <tab-link
          type="icon-and-title"
          :title="$tr('topics')"
          icon="folder"
          :link="topicsLink"
        />
        <tab-link
          name="exam-link"
          v-if="isUserLoggedIn && userHasMemberships"
          type="icon-and-title"
          :title="$tr('exams')"
          icon="assignment_late"
          :link="examsLink"
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
      search: 'Search',
      exams: 'Exams',
      clear: 'Clear',
    },
    components: {
      'explore-page': require('./explore-page'),
      'content-page': require('./content-page'),
      'learn-page': require('./learn-page'),
      'scratchpad-page': require('./scratchpad-page'),
      'content-unavailable-page': require('./content-unavailable-page'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'channel-switcher': require('./channel-switcher'),
      'breadcrumbs': require('./breadcrumbs'),
      'search-page': require('./search-page'),
      'tabs': require('kolibri.coreVue.components.tabs'),
      'tab-link': require('kolibri.coreVue.components.tabLink'),
      'exam-list': require('./exam-list'),
      'exam-page': require('./exam-page'),
      'total-points': require('./total-points'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
    data() {
      return {
        searchQuery: this.searchTerm,
      };
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
      search() {
        if (this.searchQuery !== '') {
          this.$router.push({
            name: PageNames.SEARCH,
            query: { query: this.searchQuery },
          });
        }
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
      tabLinksAreVisible() {
        return (
          this.pageName !== PageNames.CONTENT_UNAVAILABLE &&
          this.pageName !== PageNames.SEARCH
        );
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
    },
    watch: {
      searchTerm(val) {
        this.searchQuery = val || '';
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

  .search-box
    display: inline-block
    background-color: white

  .search-input
    background-color: white
    color: $core-text-default
    border: none
    height: 36px
    padding: 0
    padding-left: 0.5em
    padding-right: 0.5em
    margin: 0
    vertical-align: middle

  ::placeholder
      color: $core-text-annotation

  .search-clear-button
    color: $core-text-default
    width: 18px
    height: 22px
    visibility: hidden
    vertical-align: middle

  .search-clear-button-visble
    visibility: visible

  .search-submit-button
    width: 36px
    height: 36px

  .search-submit-button-wrapper
    display: inline-block
    background-color: $core-action-dark
    vertical-align: middle

</style>
