<template>

  <CoreBase
    :marginBottom="bottomSpaceReserved"
    :showSubNav="topNavIsVisible"
    v-bind="immersivePageProps"
  >
    <template slot="app-bar-actions">
      <ActionBarSearchBox v-if="!isWithinSearchPage" />
    </template>

    <LearnTopNav slot="sub-nav" />

    <TotalPoints slot="totalPointsMenuItem" />

    <div>
      <Breadcrumbs v-if="pageName !== 'TOPICS_CONTENT'" />
      <component :is="currentPage" />
    </div>

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import lastItem from 'lodash/last';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
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

  const RecommendedSubpageStrings = crossComponentTranslator(RecommendedSubpage);

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

  export default {
    name: 'LearnIndex',
    components: {
      ActionBarSearchBox,
      Breadcrumbs,
      CoreBase,
      LearnTopNav,
      TotalPoints,
      KPageContainer,
    },
    mixins: [responsiveWindow],
    computed: {
      ...mapState('lessonPlaylist/resource', {
        lessonContent: 'content',
        currentLesson: 'currentLesson',
      }),
      ...mapState('topicsTree', {
        topicsTreeContent: 'content',
        topicsTreeChannel: 'channel',
      }),
      ...mapState('examReportViewer', ['exam']),
      ...mapState(['pageName']),
      currentPage() {
        if (RecommendedPages.includes(this.pageName)) {
          return RecommendedSubpage;
        }
        return pageNameToComponentMap[this.pageName] || null;
      },
      immersivePageProps() {
        if (this.pageName === ClassesPageNames.EXAM_VIEWER) {
          return {
            appBarTitle: this.$store.state.examViewer.exam.title || '',
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(ClassesPageNames.CLASS_ASSIGNMENTS),
            immersivePagePrimary: false,
            immersivePageIcon: 'close',
          };
        }
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return {
            appBarTitle: this.currentLesson.title || '',
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(ClassesPageNames.LESSON_PLAYLIST),
            immersivePagePrimary: false,
            immersivePageIcon: 'close',
          };
        }
        if (this.pageName === ClassesPageNames.EXAM_REPORT_VIEWER) {
          if (this.exam) {
            return {
              appBarTitle: this.$tr('examReportTitle', {
                examTitle: this.exam.title,
              }),
              immersivePage: true,
              immersivePageRoute: this.$router.getRoute(ClassesPageNames.CLASS_ASSIGNMENTS),
              immersivePagePrimary: false,
              immersivePageIcon: 'close',
            };
          }
        }
        if (this.pageName === PageNames.SEARCH) {
          return {
            appBarTitle: this.$tr('learnTitle'),
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(PageNames.TOPICS_ROOT),
            immersivePagePrimary: true,
            immersivePageIcon: 'arrow_back',
          };
        }

        if (this.pageName === PageNames.TOPICS_CONTENT) {
          let immersivePageRoute = {};
          let appBarTitle;
          const { searchTerm, last } = this.$route.query;
          if (searchTerm) {
            immersivePageRoute = this.$router.getRoute(
              PageNames.SEARCH,
              {},
              {
                searchTerm: searchTerm,
              }
            );
          } else if (last) {
            // 'last' should only be route names for Recommended Page and its subpages
            immersivePageRoute = this.$router.getRoute(last);
            const trString = {
              [PageNames.RECOMMENDED_POPULAR]: 'documentTitleForPopular',
              [PageNames.RECOMMENDED_RESUME]: 'documentTitleForResume',
              [PageNames.RECOMMENDED_NEXT_STEPS]: 'documentTitleForNextSteps',
              [PageNames.RECOMMENDED]: 'recommended',
            }[last];
            appBarTitle = RecommendedSubpageStrings.$tr(trString);
          } else if (this.topicsTreeContent.parent) {
            // Need to guard for parent being non-empty to avoid console errors
            immersivePageRoute = this.$router.getRoute(PageNames.TOPICS_TOPIC, {
              id: this.topicsTreeContent.parent,
            });

            if (this.topicsTreeContent.breadcrumbs.length > 0) {
              appBarTitle = lastItem(this.topicsTreeContent.breadcrumbs).title;
            } else {
              // `breadcrumbs` is empty if the direct parent is the channel, so pull
              // channel info from state.topicsTree.channel
              appBarTitle = this.topicsTreeChannel.title;
            }
          }
          return {
            appBarTitle,
            immersivePage: true,
            immersivePageRoute,
            immersivePagePrimary: false,
            immersivePageIcon: 'arrow_back',
          };
        }

        return {
          appBarTitle: this.$tr('learnTitle'),
          immersivePage: false,
        };
      },
      isWithinSearchPage() {
        return this.pageName === PageNames.SEARCH;
      },
      topNavIsVisible() {
        return (
          this.pageName !== PageNames.CONTENT_UNAVAILABLE &&
          this.pageName !== PageNames.SEARCH &&
          !this.immersivePageProps.immersivePage
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
    $trs: {
      learnTitle: 'Learn',
      examReportTitle: '{examTitle} report',
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';

  .content {
    margin: auto;
  }

</style>
