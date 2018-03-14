<template>

  <core-base
    :topLevelPageName="topLevelPageName"
    :appBarTitle="appBarTitle"
    :bottomMargin="bottomSpaceReserved"
    :immersivePage="isImmersivePage"
    :immersivePageIcon="immersivePageIcon"
    :immersivePagePrimary="immersivePageIsPrimary"
    :immersivePageRoute="immersiveToolbarRoute"
  >
    <template slot="app-bar-actions">
      <action-bar-search-box v-if="!isWithinSearchPage" />
    </template>

    <div v-if="tabLinksAreVisible" class="k-navbar-links">
      <k-navbar>
        <k-navbar-link
          name="classes-link"
          v-if="isUserLoggedIn && userHasMemberships"
          type="icon-and-title"
          :title="$tr('classes')"
          icon="business"
          :link="allClassesLink"
        />
        <k-navbar-link
          type="icon-and-title"
          :title="$tr('channels')"
          icon="apps"
          :link="channelsLink"
        />
        <k-navbar-link
          type="icon-and-title"
          :title="$tr('recommended')"
          icon="forum"
          :link="recommendedLink"
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

  import { PageNames, RecommendedPages, ClassesPageNames } from '../constants';
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
  import examPage from './exam-page';
  import totalPoints from './total-points';
  import AllClassesPage from './classes/AllClassesPage';
  import ClassAssignmentsPage from './classes/ClassAssignmentsPage';
  import LessonPlaylistPage from './classes/LessonPlaylistPage';
  import LessonResourceViewer from './classes/LessonResourceViewer';
  import actionBarSearchBox from './action-bar-search-box';

  const BOTTOM_SPACED_RESERVED = 88;

  const pageNameToComponentMap = {
    [PageNames.TOPICS_ROOT]: channelsPage,
    [PageNames.TOPICS_CHANNEL]: topicsPage,
    [PageNames.TOPICS_TOPIC]: topicsPage,
    [PageNames.TOPICS_CONTENT]: contentPage,
    [PageNames.RECOMMENDED_CONTENT]: contentPage,
    [PageNames.RECOMMENDED]: learnPage,
    [PageNames.CONTENT_UNAVAILABLE]: contentUnavailablePage,
    [PageNames.SEARCH]: searchPage,
    [ClassesPageNames.EXAM_VIEWER]: examPage,
    [ClassesPageNames.ALL_CLASSES]: AllClassesPage,
    [ClassesPageNames.CLASS_ASSIGNMENTS]: ClassAssignmentsPage,
    [ClassesPageNames.LESSON_PLAYLIST]: LessonPlaylistPage,
    [ClassesPageNames.LESSON_RESOURCE_VIEWER]: LessonResourceViewer,
  };

  const immersivePages = [ClassesPageNames.LESSON_RESOURCE_VIEWER];

  export default {
    name: 'learn',
    $trs: {
      learnTitle: 'Learn',
      recommended: 'Recommended',
      channels: 'Channels',
      classes: 'Classes',
    },
    components: {
      coreBase,
      breadcrumbs,
      kNavbar,
      kNavbarLink,
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
        if (RecommendedPages.includes(this.pageName)) {
          return recommendedSubpage;
        }
        return pageNameToComponentMap[this.pageName] || null;
      },
      appBarTitle() {
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          if (this.content) {
            return this.content.title;
          }
        }
        return this.$tr('learnTitle');
      },
      isImmersivePage() {
        return immersivePages.includes(this.pageName);
      },
      immersiveToolbarRoute() {
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return {
            name: ClassesPageNames.LESSON_PLAYLIST,
          };
        }
      },
      immersivePageIsPrimary() {
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return false;
        }
        return true;
      },
      immersivePageIcon() {
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return 'arrow_back';
        }
        return null;
      },
      isWithinSearchPage() {
        return this.pageName === PageNames.SEARCH;
      },
      tabLinksAreVisible() {
        return (
          this.pageName !== PageNames.CONTENT_UNAVAILABLE &&
          this.pageName !== PageNames.SEARCH &&
          !this.isImmersivePage
        );
      },
      pointsAreVisible() {
        return (
          this.windowSize.breakpoint > 0 &&
          this.pageName !== PageNames.SEARCH &&
          !this.isImmersivePage
        );
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
      allClassesLink() {
        return {
          name: ClassesPageNames.ALL_CLASSES,
        };
      },
      bottomSpaceReserved() {
        const isContentPage =
          this.pageName === PageNames.TOPICS_CONTENT ||
          this.pageName === PageNames.RECOMMENDED_CONTENT;
        const isAssessment = isContentPage && this.content && this.content.assessment;
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
    color: $core-status-correct
    position: relative

  .points-wrapper
    margin-top: -70px
    float: right

</style>
