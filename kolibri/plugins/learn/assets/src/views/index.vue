<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('learnTitle')">
    <div slot="app-bar-actions">
      <action-bar-search-box v-if="!isWithinSearchPage"/>
      <channel-switcher @switch="switchChannel"/>
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

    <div v-if="pointsAreVisible" class="points-wrapper">
      <a class="points-link" href="/user"><total-points/></a>
    </div>

    <div>
      <breadcrumbs/>
      <component :is="currentPage"/>
    </div>

  </core-base>

</template>


<script>

  import * as getters from '../state/getters';
  import store from '../state/store';
  import { PageNames, PageModes } from '../constants';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import explorePage from './explore-page';
  import contentPage from './content-page';
  import learnPage from './learn-page';
  import scratchpadPage from './scratchpad-page';
  import contentUnavailablePage from './content-unavailable-page';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import channelSwitcher from './channel-switcher';
  import breadcrumbs from './breadcrumbs';
  import searchPage from './search-page';
  import tabs from 'kolibri.coreVue.components.tabs';
  import tabLink from 'kolibri.coreVue.components.tabLink';
  import examList from './exam-list';
  import examPage from './exam-page';
  import totalPoints from './total-points';
  import actionBarSearchBox from './action-bar-search-box';
  export default {
    $trNameSpace: 'learn',
    $trs: {
      learnTitle: 'Learn',
      recommended: 'Recommended',
      topics: 'Topics',
      exams: 'Exams',
    },
    mixins: [responsiveWindow],
    components: {
      explorePage,
      contentPage,
      learnPage,
      scratchpadPage,
      contentUnavailablePage,
      coreBase,
      channelSwitcher,
      breadcrumbs,
      searchPage,
      tabs,
      tabLink,
      examList,
      examPage,
      totalPoints,
      actionBarSearchBox,
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
        if (
          this.pageName === PageNames.EXPLORE_CHANNEL ||
          this.pageName === PageNames.EXPLORE_TOPIC
        ) {
          return 'explore-page';
        }
        if (
          this.pageName === PageNames.EXPLORE_CONTENT ||
          this.pageName === PageNames.LEARN_CONTENT
        ) {
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
      isWithinSearchPage() {
        return this.pageName === PageNames.SEARCH || this.pageName === PageNames.SEARCH_ROOT;
      },
      tabLinksAreVisible() {
        return this.pageName !== PageNames.CONTENT_UNAVAILABLE && this.pageName !== PageNames.SEARCH;
      },
      pointsAreVisible() {
        return this.windowSize.breakpoint > 0 && this.pageName !== PageNames.SEARCH;
      },
      recommendedLink() {
        return {
          name: PageNames.LEARN_CHANNEL,
          params: { channel_id: this.channelId },
        };
      },
      topicsLink() {
        return {
          name: PageNames.EXPLORE_CHANNEL,
          params: { channel_id: this.channelId },
        };
      },
      examsLink() {
        return {
          name: PageNames.EXAM_LIST,
          params: { channel_id: this.channelId },
        };
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
    store,
  };

</script>


<style lang="stylus" scoped>

  @require 'learn.styl'
  @require '~kolibri.styles.definitions'

  .content
    margin: auto

  .points-link
    display: inline-block
    text-decoration: none

  .points-wrapper
    margin-top: -70px
    float: right

</style>
