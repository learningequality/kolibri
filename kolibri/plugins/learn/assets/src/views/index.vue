<template>

  <core-base
    :topLevelPageName="topLevelPageName"
    :appBarTitle="$tr('learnTitle')"
    :bottomMargin="bottomSpaceReserved"
  >
    <template slot="app-bar-actions">
      <action-bar-search-box v-if="!isWithinSearchPage" />
    </template>

    <div v-if="tabLinksAreVisible" class="k-navbar-links">
      <k-navbar>
        <k-navbar-link
          type="icon-and-title"
          :title="$tr('recommended')"
          icon="forum"
          :link="recommendedLink"
        />
        <k-navbar-link
          type="icon-and-title"
          :title="$tr('channels')"
          icon="apps"
          :link="channelsLink"
        />
        <k-navbar-link
          name="exam-link"
          v-if="isUserLoggedIn && userHasMemberships"
          type="icon-and-title"
          :title="$tr('exams')"
          icon="assignment_late"
          :link="examsLink"
        />
      </k-navbar>
    </div>

    <div v-if="pointsAreVisible" class="points-wrapper">
      <a class="points-link" href="/user"><total-points /></a>
    </div>

    <div>
      <breadcrumbs />
      <component :is="currentPage" />
    </div>

  </core-base>

</template>


<script>

  import { PageNames, RecommendedPages } from '../constants';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import channelsPage from './channels-page';
  import topicsPage from './topics-page';
  import contentPage from './content-page';
  import learnPage from './learn-page';
  import recommendedSubpage from './recommended-subpage';
  import contentUnavailablePage from './content-unavailable-page';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import breadcrumbs from './breadcrumbs';
  import searchPage from './search-page';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  import examList from './exam-list';
  import examPage from './exam-page';
  import totalPoints from './total-points';
  import actionBarSearchBox from './action-bar-search-box';

  const BOTTOM_SPACED_RESERVED = 88;

  export default {
    name: 'learn',
    $trs: {
      learnTitle: 'Learn',
      recommended: 'Recommended',
      channels: 'Channels',
      exams: 'Exams',
    },
    components: {
      channelsPage,
      topicsPage,
      contentPage,
      learnPage,
      recommendedSubpage,
      contentUnavailablePage,
      coreBase,
      breadcrumbs,
      searchPage,
      kNavbar,
      kNavbarLink,
      examList,
      examPage,
      totalPoints,
      actionBarSearchBox,
    },
    mixins: [responsiveWindow],
    computed: {
      topLevelPageName() {
        return TopLevelPageNames.LEARN;
      },
      userHasMemberships() {
        return this.memberships.length > 0;
      },
      currentPage() {
        if (this.pageName === PageNames.TOPICS_ROOT) {
          return 'channels-page';
        }
        if (this.pageName === PageNames.TOPICS_CHANNEL || this.pageName === PageNames.TOPICS_TOPIC) {
          return 'topics-page';
        }
        if (
          this.pageName === PageNames.TOPICS_CONTENT ||
          this.pageName === PageNames.RECOMMENDED_CONTENT
        ) {
          return 'content-page';
        }
        if (this.pageName === PageNames.RECOMMENDED) {
          return 'learn-page';
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
        if (RecommendedPages.includes(this.pageName)) {
          return 'recommended-subpage';
        }
        return null;
      },
      isWithinSearchPage() {
        return this.pageName === PageNames.SEARCH;
      },
      tabLinksAreVisible() {
        return this.pageName !== PageNames.CONTENT_UNAVAILABLE && this.pageName !== PageNames.SEARCH;
      },
      pointsAreVisible() {
        return this.windowSize.breakpoint > 0 && this.pageName !== PageNames.SEARCH;
      },
      recommendedLink() {
        return {
          name: PageNames.RECOMMENDED,
        };
      },
      channelsLink() {
        return {
          name: PageNames.TOPICS_ROOT,
        };
      },
      examsLink() {
        return {
          name: PageNames.EXAM_LIST,
        };
      },
      bottomSpaceReserved() {
        const isAssessment =
          this.currentPage === 'content-page' && this.content && this.content.assessment;
        // height of .attemptprogress-container.mobile in assessment-wrapper
        return isAssessment && this.windowSize.breakpoint <= 1 ? BOTTOM_SPACED_RESERVED : 0;
      },
    },

    vuex: {
      getters: {
        memberships: state => state.learnAppState.memberships,
        pageName: state => state.pageName,
        searchTerm: state => state.pageState.searchTerm,
        isUserLoggedIn,
        content: state => state.pageState.content,
      },
    },
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
