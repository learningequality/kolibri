<template>

  <CoreBase
    :appBarTitle="appBarTitle"
    :bottomMargin="bottomSpaceReserved"
    :immersivePage="isImmersivePage"
    :immersivePageIcon="immersivePageIcon"
    :immersivePagePrimary="immersivePageIsPrimary"
    :immersivePageRoute="immersiveToolbarRoute"
  >
    <template slot="app-bar-actions">
      <ActionBarSearchBox v-if="!isWithinSearchPage" />
    </template>

    <div v-if="tabLinksAreVisible" class="k-navbar-links">
      <KNavbar>
        <KNavbarLink
          name="classes-link"
          v-if="isUserLoggedIn && userHasMemberships"
          type="icon-and-title"
          :title="$tr('classes')"
          :link="allClassesLink"
        >
          <mat-svg name="business" category="communication" />
        </KNavbarLink>
        <KNavbarLink
          type="icon-and-title"
          :title="$tr('channels')"
          :link="channelsLink"
        >
          <mat-svg name="apps" category="navigation" />
        </KNavbarLink>
        <KNavbarLink
          type="icon-and-title"
          :title="$tr('recommended')"
          :link="recommendedLink"
        >
          <mat-svg name="forum" category="communication" />
        </KNavbarLink>
      </KNavbar>
    </div>

    <div v-if="pointsAreVisible" class="points-wrapper">
      <a class="points-link" href="/user"><TotalPoints /></a>
    </div>

    <div>
      <Breadcrumbs />
      <component :is="currentPage" />
    </div>

  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { PageNames, RecommendedPages, ClassesPageNames } from '../constants';
  import channelsPage from './ChannelsPage';
  import topicsPage from './TopicsPage';
  import contentPage from './ContentPage';
  import recommendedPage from './RecommendedPage';
  import recommendedSubpage from './RecommendedSubpage';
  import contentUnavailablePage from './ContentUnavailablePage';
  import Breadcrumbs from './Breadcrumbs';
  import searchPage from './SearchPage';
  import examPage from './ExamPage';
  import examReportViewer from './LearnExamReportViewer';
  import TotalPoints from './TotalPoints';
  import AllClassesPage from './classes/AllClassesPage';
  import ClassAssignmentsPage from './classes/ClassAssignmentsPage';
  import LessonPlaylistPage from './classes/LessonPlaylistPage';
  import LessonResourceViewer from './classes/LessonResourceViewer';
  import ActionBarSearchBox from './ActionBarSearchBox';

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
    name: 'LearnIndex',
    $trs: {
      learnTitle: 'Learn',
      recommended: 'Recommended',
      channels: 'Channels',
      classes: 'Classes',
      examReportTitle: '{examTitle} report',
    },
    components: {
      ActionBarSearchBox,
      Breadcrumbs,
      CoreBase,
      KNavbar,
      KNavbarLink,
      TotalPoints,
    },
    mixins: [responsiveWindow],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState({
        memberships: state => state.learnAppState.memberships,
        pageName: state => state.pageName,
        searchTerm: state => state.pageState.searchTerm,
        content: state => state.pageState.content,
        exam: state => state.pageState.exam,
      }),
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
        // height of .attempts-container in AssessmentWrapper
        return isAssessment ? BOTTOM_SPACED_RESERVED : 0;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';
  @import '~kolibri.styles.definitions';

  .content {
    margin: auto;
  }

  .points-link {
    position: relative;
    display: inline-block;
    color: $core-status-correct;
    text-decoration: none;
  }

  .points-wrapper {
    float: right;
    margin-top: -70px;
  }

</style>
