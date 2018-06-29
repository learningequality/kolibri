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
          :link="allClassesLink"
        >
          <mat-svg name="business" category="communication" />
        </k-navbar-link>
        <k-navbar-link
          type="icon-and-title"
          :title="$tr('channels')"
          :link="channelsLink"
        >
          <mat-svg name="apps" category="navigation" />
        </k-navbar-link>
        <k-navbar-link
          type="icon-and-title"
          :title="$tr('recommended')"
          :link="recommendedLink"
        >
          <mat-svg name="forum" category="communication" />
        </k-navbar-link>
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

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  import { PageNames, RecommendedPages, ClassesPageNames } from '../constants';
  import channelsPage from './channels-page';
  import topicsPage from './topics-page';
  import contentPage from './content-page';
  import recommendedPage from './recommended-page';
  import recommendedSubpage from './recommended-subpage';
  import contentUnavailablePage from './content-unavailable-page';
  import breadcrumbs from './breadcrumbs';
  import searchPage from './search-page';
  import examPage from './exam-page';
  import examReportViewer from './exam-report-viewer';
  import totalPoints from './total-points';
  import AllClassesPage from './classes/AllClassesPage';
  import ClassAssignmentsPage from './classes/ClassAssignmentsPage';
  import LessonPlaylistPage from './classes/LessonPlaylistPage';
  import LessonResourceViewer from './classes/LessonResourceViewer';
  import actionBarSearchBox from './action-bar-search-box';

  const BOTTOM_SPACED_RESERVED = 117;

  const pageNameToComponentMap = {
    [PageNames.TOPICS_ROOT]: channelsPage,
    [PageNames.TOPICS_CHANNEL]: topicsPage,
    [PageNames.TOPICS_TOPIC]: topicsPage,
    [PageNames.TOPICS_CONTENT]: contentPage,
    [PageNames.RECOMMENDED_CONTENT]: contentPage,
    [PageNames.RECOMMENDED]: recommendedPage,
    [PageNames.CONTENT_UNAVAILABLE]: contentUnavailablePage,
    [PageNames.SEARCH]: searchPage,
    [ClassesPageNames.EXAM_VIEWER]: examPage,
    [ClassesPageNames.EXAM_REPORT_VIEWER]: examReportViewer,
    [ClassesPageNames.ALL_CLASSES]: AllClassesPage,
    [ClassesPageNames.CLASS_ASSIGNMENTS]: ClassAssignmentsPage,
    [ClassesPageNames.LESSON_PLAYLIST]: LessonPlaylistPage,
    [ClassesPageNames.LESSON_RESOURCE_VIEWER]: LessonResourceViewer,
  };

  const immersivePages = [
    ClassesPageNames.LESSON_RESOURCE_VIEWER,
    ClassesPageNames.EXAM_REPORT_VIEWER,
  ];

  export default {
    name: 'learn',
    $trs: {
      learnTitle: 'Learn',
      recommended: 'Recommended',
      channels: 'Channels',
      classes: 'Classes',
      examReportTitle: '{examTitle} report',
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
        } else if (this.pageName === ClassesPageNames.EXAM_REPORT_VIEWER) {
          if (this.exam) {
            return this.$tr('examReportTitle', {
              examTitle: this.exam.title,
            });
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
        } else if (this.pageName === ClassesPageNames.EXAM_REPORT_VIEWER) {
          return {
            name: ClassesPageNames.CLASS_ASSIGNMENTS,
          };
        }
      },
      immersivePageIsPrimary() {
        if (
          this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER ||
          this.pageName === ClassesPageNames.EXAM_REPORT_VIEWER
        ) {
          return false;
        }
        return true;
      },
      immersivePageIcon() {
        if (
          this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER ||
          this.pageName === ClassesPageNames.EXAM_REPORT_VIEWER
        ) {
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
          this.pageName === PageNames.RECOMMENDED_CONTENT ||
          ClassesPageNames.LESSON_PLAYLIST;
        const isAssessment = isContentPage && this.content && this.content.assessment;
        // height of .attempts-container in assessment-wrapper
        return isAssessment ? BOTTOM_SPACED_RESERVED : 0;
      },
    },

    vuex: {
      getters: {
        memberships: state => state.learnAppState.memberships,
        pageName: state => state.pageName,
        searchTerm: state => state.pageState.searchTerm,
        isUserLoggedIn,
        content: state => state.pageState.content,
        exam: state => state.pageState.exam,
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
