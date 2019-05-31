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

    <EdulutionTopNav slot="sub-nav" />

    <TotalPoints slot="totalPointsMenuItem" />

    <div>
      <Breadcrumbs />
      <component :is="currentPage" />
    </div>

  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import store from 'kolibri.coreVue.vuex.store';
  import ContentPage from '../../../../learn/assets/src/views/ContentPage';
  import { PageNames, RecommendedPages, ClassesPageNames, pageNameToModuleMap } from '../constants';
  import LessonResourceViewer from '../../../../learn/assets/src/views/classes/LessonResourceViewer';
  import RecommendedPage from '../../../../learn/assets/src/views/RecommendedPage';
  import TotalPoints from '../../../../learn/assets/src/views/TotalPoints';
  import TopicsPage from '../../../../learn/assets/src/views/TopicsPage';
  import SearchPage from '../../../../learn/assets/src/views/SearchPage';
  import ActionBarSearchBox from '../../../../learn/assets/src/views/ActionBarSearchBox';
  import RecommendedSubpage from '../../../../learn/assets/src/views/RecommendedSubpage';
  import ExamReportViewer from '../../../../learn/assets/src/views/LearnExamReportViewer';
  import ExamPage from '../../../../learn/assets/src/views/ExamPage';
  import AllClassesPage from '../../../../learn/assets/src/views/classes/AllClassesPage';
  import ClassAssignmentsPage from '../../../../learn/assets/src/views/classes/ClassAssignmentsPage';
  import LessonPlaylistPage from '../../../../learn/assets/src/views/classes/LessonPlaylistPage';
  import ContentUnavailablePage from '../../../../learn/assets/src/views/ContentUnavailablePage';
  import { THEME_MODULE_NAMESPACE } from '../../../../../core/assets/src/state/modules/theme';
  import ChannelsPage from './ChannelsPage';
  import Breadcrumbs from './Breadcrumbs';
  import EdulutionTopNav from './EdulutionTopNav';
  import KnowledgeMap from './KnowledgeMap';

  // Bottom toolbar is 111px high on mobile, 113px normally.
  // We reserve the smaller number so there is no gap on either screen size.
  const BOTTOM_SPACED_RESERVED = 111;

  const pageNameToComponentMap = {
    [PageNames.TOPICS_ROOT]: ChannelsPage,
    [PageNames.TOPICS_CHANNEL]: TopicsPage,
    [PageNames.TOPICS_TOPIC]: TopicsPage,
    [PageNames.TOPICS_CONTENT]: ContentPage,
    [PageNames.KNOWLEDGE_MAP]: KnowledgeMap,
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
    name: 'EdulutionIndex',
    $trs: {
      edulutionTitle: 'Learn',
      examReportTitle: '{examTitle} report',
    },
    components: {
      ActionBarSearchBox,
      Breadcrumbs,
      CoreBase,
      EdulutionTopNav,
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
        return this.$tr('edulutionTitle');
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
    watch: {
      $route(to, _) {
        if (pageNameToModuleMap[to.name] !== 'topicsTree') {
          store.commit(`${THEME_MODULE_NAMESPACE}/RESET_THEME_VALUE`, '$core-accent-color');
          store.commit(`${THEME_MODULE_NAMESPACE}/RESET_THEME_VALUE`, '$core-action-dark');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content {
    margin: auto;
  }

</style>
