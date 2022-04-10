<template>

  <LearnImmersiveLayout
    v-if="currentPageIsContent"
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
    :back="learnBackPageRoute"
    :content="content"
  />

  <CoreBase
    v-else
    :marginBottom="bottomSpaceReserved"
    :showSubNav="topNavIsVisible"
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
    v-bind="immersivePageProps"
  >

    <template #sub-nav>
      <LearnTopNav />
    </template>

    <template #totalPointsMenuItem>
      <TotalPoints />
    </template>

    <div>
      <component :is="currentPage" v-if="currentPage" />
      <router-view />
    </div>

  </CoreBase>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import lastItem from 'lodash/last';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { PageNames, ClassesPageNames } from '../constants';
  import useChannels from '../composables/useChannels';
  import commonLearnStrings from './commonLearnStrings';
  import TopicsPage from './TopicsPage';
  import ContentUnavailablePage from './ContentUnavailablePage';
  import LearnImmersiveLayout from './LearnImmersiveLayout';
  import ExamPage from './ExamPage';
  import ExamReportViewer from './LearnExamReportViewer';
  import TotalPoints from './TotalPoints';
  import AllClassesPage from './classes/AllClassesPage';
  import ClassAssignmentsPage from './classes/ClassAssignmentsPage';
  import LessonPlaylistPage from './classes/LessonPlaylistPage';
  import LearnTopNav from './LearnTopNav';
  import { ASSESSMENT_FOOTER, QUIZ_FOOTER } from './footers.js';
  import BookmarkPage from './BookmarkPage.vue';
  import plugin_data from 'plugin_data';

  const pageNameToComponentMap = {
    [PageNames.TOPICS_TOPIC]: TopicsPage,
    [PageNames.TOPICS_TOPIC_SEARCH]: TopicsPage,
    [PageNames.CONTENT_UNAVAILABLE]: ContentUnavailablePage,
    [PageNames.BOOKMARKS]: BookmarkPage,
    [ClassesPageNames.EXAM_VIEWER]: ExamPage,
    [ClassesPageNames.EXAM_REPORT_VIEWER]: ExamReportViewer,
    [ClassesPageNames.ALL_CLASSES]: AllClassesPage,
    [ClassesPageNames.CLASS_ASSIGNMENTS]: ClassAssignmentsPage,
    [ClassesPageNames.LESSON_PLAYLIST]: LessonPlaylistPage,
  };

  export default {
    name: 'LearnIndex',
    components: {
      CoreBase,
      LearnTopNav,
      TotalPoints,
      LearnImmersiveLayout,
    },
    mixins: [commonCoreStrings, commonLearnStrings, responsiveWindowMixin],
    setup() {
      const { channelsMap } = useChannels();
      return {
        channelsMap,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState('classAssignments', {
        classroomName: state => state.currentClassroom.name,
      }),
      ...mapState('topicsTree', ['content', 'topic']),
      ...mapState('examReportViewer', ['exam']),
      ...mapState(['pageName']),
      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (
          (plugin_data.allowGuestAccess && this.$store.getters.allowAccess) || this.isUserLoggedIn
        );
      },
      currentPage() {
        return pageNameToComponentMap[this.pageName] || null;
      },
      currentPageIsContent() {
        return this.pageName === PageNames.TOPICS_CONTENT;
      },
      currentTopicIsCustom() {
        return (
          this.topic && this.topic.options && this.topic.options.modality === 'CUSTOM_NAVIGATION'
        );
      },
      immersivePageProps() {
        if (this.pageName === ClassesPageNames.EXAM_VIEWER) {
          return {
            appBarTitle: this.classroomName || '',
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(ClassesPageNames.CLASS_ASSIGNMENTS),
            immersivePagePrimary: true,
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
        if (this.pageName === PageNames.TOPICS_TOPIC && this.currentTopicIsCustom) {
          return {
            appBarTitle: this.channelsMap[this.topic.channel_id].title || '',
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(PageNames.LIBRARY),
            immersivePagePrimary: false,
            immersivePageIcon: 'back',
          };
        }
        if (this.pageName === PageNames.TOPICS_CONTENT) {
          let immersivePageRoute = {};
          let appBarTitle;
          const { last } = this.$route.query;
          if (last) {
            // 'last' should only be route names for Recommended Page and its subpages
            immersivePageRoute = this.$router.getRoute(last);
            appBarTitle = {
              [PageNames.RECOMMENDED_POPULAR]: this.learnString('popularLabel'),
              [PageNames.RECOMMENDED_RESUME]: this.learnString('resumeLabel'),
              [PageNames.RECOMMENDED_NEXT_STEPS]: this.learnString('nextStepsLabel'),
              [PageNames.LIBRARY]: this.learnString('libraryLabel'),
            }[last];
          } else if (this.content.parent) {
            // Need to guard for parent being non-empty to avoid console errors
            immersivePageRoute = this.$router.getRoute(PageNames.TOPICS_TOPIC, {
              id: this.content.parent,
            });

            if (this.content.ancestors.length > 1) {
              appBarTitle = lastItem(this.content.ancestors).title;
            } else {
              // `ancestors` only has one entry if the direct parent is the channel
              appBarTitle = this.channelsMap[this.content.channel_id].title;
            }
          }
          return {
            appBarTitle,
            immersivePage: true,
            immersivePageRoute,
            immersivePagePrimary: false,
            immersivePageIcon: 'close',
          };
        }
        if (this.pageName === PageNames.LIBRARY) {
          return {
            appBarTitle: this.learnString('learnLabel'),
            immersivePage: false,
            hasSidebar: true,
          };
        }
        if (
          this.pageName === PageNames.TOPICS_TOPIC ||
          this.pageName === PageNames.TOPICS_TOPIC_SEARCH
        ) {
          let immersivePageRoute;
          if (this.$route.query.last == PageNames.HOME) {
            immersivePageRoute = this.$router.getRoute(PageNames.HOME);
          } else {
            immersivePageRoute = this.$router.getRoute(PageNames.LIBRARY);
          }
          return {
            appBarTitle: this.coreString('browseChannel'),
            immersivePage: true,
            immersivePageRoute,
            immersivePagePrimary: true,
            immersivePageIcon: 'close',
            hasSidebar: true,
          };
        }
        return {
          appBarTitle: this.learnString('learnLabel'),
          immersivePage: false,
        };
      },
      topNavIsVisible() {
        return (
          this.pageName !== PageNames.CONTENT_UNAVAILABLE && !this.immersivePageProps.immersivePage
        );
      },
      bottomSpaceReserved() {
        if (this.pageName === ClassesPageNames.EXAM_VIEWER) {
          return QUIZ_FOOTER;
        }
        let content;
        if (this.pageName === PageNames.RECOMMENDED_CONTENT) {
          content = this.content;
        }
        const isAssessment = content && content.assessment;
        // height of .attempts-container in AssessmentWrapper
        return isAssessment ? ASSESSMENT_FOOTER : 0;
      },
      learnBackPageRoute() {
        // extract the key pieces of routing from immersive page props, but since we don't need
        // them all, just create two alternative route paths for return/'back' navigation
        let route = {};
        const query = { ...this.$route.query };
        delete query.last;
        delete query.topicId;
        if (
          this.$route.query.last === PageNames.TOPICS_TOPIC_SEARCH ||
          this.$route.query.last === PageNames.TOPICS_TOPIC
        ) {
          const lastId = this.$route.query.topicId
            ? this.$route.query.topicId
            : this.content.parent;
          const lastPage = this.$route.query.last;
          // Need to guard for parent being non-empty to avoid console errors
          route = this.$router.getRoute(
            lastPage,
            {
              id: lastId,
            },
            query
          );
        } else if (this.$route.query && this.$route.query.last === PageNames.LIBRARY) {
          const lastPage = this.$route.query.last;
          route = this.$router.getRoute(lastPage, {}, query);
        } else if (this.$route.query && this.$route.query.last) {
          const last = this.$route.query.last;
          route = this.$router.getRoute(last, query);
        } else {
          route = this.$router.getRoute(PageNames.HOME);
        }
        return route;
      },
    },
    $trs: {
      examReportTitle: {
        message: 'Report for { examTitle }',
        context: 'Indicates the title of the quiz that the report corresponds to.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';

  .content {
    margin: auto;
  }

</style>
