<template>

  <CoreBase
    :appBarTitle="appBarTitle"
    :bottomMargin="bottomSpaceReserved"
    :immersivePage="isImmersivePage"
    :immersivePageIcon="immersivePageIcon"
    :immersivePagePrimary="immersivePageIsPrimary"
    :immersivePageRoute="immersiveToolbarRoute"
    :showSubNav="topNavIsVisible"
  >
    <template slot="app-bar-actions">
      <ActionBarSearchBox v-if="!isWithinSearchPage" />
    </template>

    <LearnTopNav slot="sub-nav" />

    <TotalPoints slot="totalPointsMenuItem" />

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
  import { PageNames, RecommendedPages, ClassesPageNames } from '../constants';
  import ChannelsPage from './ChannelsPage';
  import TopicsPage from './TopicsPage';
  import ContentPage from './ContentPage';
  import RecommendedPage from './RecommendedPage';
  import RecommendedSubpage from './RecommendedSubpage';
  import ContentUnavailablePage from './ContentUnavailablePage';
  import Breadcrumbs from './Breadcrumbs';
  import SearchPage from './SearchPage';
  import ExamPage from './ExamPage';
  import ExamReportViewer from './LearnExamReportViewer';
  import TotalPoints from './TotalPoints';
  import AllClassesPage from './classes/AllClassesPage';
  import ClassAssignmentsPage from './classes/ClassAssignmentsPage';
  import LessonPlaylistPage from './classes/LessonPlaylistPage';
  import LessonResourceViewer from './classes/LessonResourceViewer';
  import ActionBarSearchBox from './ActionBarSearchBox';
  import LearnTopNav from './LearnTopNav';

  // Bottom toolbar is 111px high on mobile, 113px normally.
  // We reserve the smaller number so there is no gap on either screen size.
  const BOTTOM_SPACED_RESERVED = 111;

  const pageNameToComponentMap = {
    [PageNames.TOPICS_ROOT]: ChannelsPage,
    [PageNames.TOPICS_CHANNEL]: TopicsPage,
    [PageNames.TOPICS_TOPIC]: TopicsPage,
    [PageNames.TOPICS_CONTENT]: ContentPage,
    [PageNames.RECOMMENDED]: RecommendedPage,
    [PageNames.CONTENT_UNAVAILABLE]: ContentUnavailablePage,
    [PageNames.SEARCH]: SearchPage,
    [ClassesPageNames.EXAM_VIEWER]: ExamPage,
    [ClassesPageNames.EXAM_REPORT_VIEWER]: ExamReportViewer,
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
      examReportTitle: '{examTitle} report',
    },
    components: {
      ActionBarSearchBox,
      Breadcrumbs,
      CoreBase,
      LearnTopNav,
      TotalPoints,
    },
    mixins: [responsiveWindow],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState('lessonPlaylist/resource', {
        lessonContent: 'content',
      }),
      ...mapState('topicsTree', {
        topicsTreeContent: 'content',
      }),
      ...mapState('examReportViewer', ['exam']),
      ...mapState(['pageName']),
      topLevelPageName() {
        return TopLevelPageNames.LEARN;
      },
      currentPage() {
        if (RecommendedPages.includes(this.pageName)) {
          return RecommendedSubpage;
        }
        return pageNameToComponentMap[this.pageName] || null;
      },
      appBarTitle() {
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return this.lessonContent.title || '';
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
      topNavIsVisible() {
        return (
          this.pageName !== PageNames.CONTENT_UNAVAILABLE &&
          this.pageName !== PageNames.SEARCH &&
          !this.isImmersivePage
        );
      },
      bottomSpaceReserved() {
        let content;
        if (
          this.pageName === PageNames.TOPICS_CONTENT ||
          this.pageName === PageNames.RECOMMENDED_CONTENT
        ) {
          content = this.topicsTreeContent;
        } else if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          content = this.lessonContent;
        }
        const isAssessment = content && content.assessment;
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

</style>
