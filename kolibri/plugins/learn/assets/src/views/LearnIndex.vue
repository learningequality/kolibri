<template>

  <LearnImmersiveLayout
    v-if="currentPageIsContentOrLesson"
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
    :maxMainWidth="maxWidth"
  >
    <template #app-bar-actions>
      <ActionBarSearchBox v-if="showSearch" />
    </template>

    <template #sub-nav>
      <LearnTopNav />
    </template>

    <template #totalPointsMenuItem>
      <TotalPoints />
    </template>

    <!--
      Topics pages have a different heading style which
      includes passing the breadcrumbs
    -->
    <div v-if="currentPageIsTopic">
      <component :is="currentPage">
        <template #breadcrumbs>
          <Breadcrumbs />
        </template>
      </component>
      <router-view />
    </div>

    <div v-else>
      <Breadcrumbs v-if="pageName !== 'TOPICS_CONTENT'" />
      <component :is="currentPage" v-if="currentPage" />
      <router-view />
    </div>

    <UpdateYourProfileModal
      v-if="profileNeedsUpdate"
      :disabled="demographicInfo === null || !userPluginUrl"
      @cancel="handleCancelUpdateYourProfileModal"
      @submit="handleSubmitUpdateYourProfileModal"
    />


  </CoreBase>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import urls from 'kolibri.urls';
  import lastItem from 'lodash/last';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { PageNames, ClassesPageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import TopicsPage from './TopicsPage';
  import ContentPage from './ContentPage';
  import ContentUnavailablePage from './ContentUnavailablePage';
  import Breadcrumbs from './Breadcrumbs';
  import SearchPage from './SearchPage';
  import LearnImmersiveLayout from './LearnImmersiveLayout';
  import ExamPage from './ExamPage';
  import ExamReportViewer from './LearnExamReportViewer';
  import TotalPoints from './TotalPoints';
  import AllClassesPage from './classes/AllClassesPage';
  import ClassAssignmentsPage from './classes/ClassAssignmentsPage';
  import LessonPlaylistPage from './classes/LessonPlaylistPage';
  import LessonResourceViewer from './classes/LessonResourceViewer';
  import ActionBarSearchBox from './ActionBarSearchBox';
  import LearnTopNav from './LearnTopNav';
  import { ASSESSMENT_FOOTER, QUIZ_FOOTER } from './footers.js';
  import UpdateYourProfileModal from './UpdateYourProfileModal';
  import plugin_data from 'plugin_data';

  const pageNameToComponentMap = {
    [PageNames.TOPICS_CHANNEL]: TopicsPage,
    [PageNames.TOPICS_TOPIC]: TopicsPage,
    [PageNames.TOPICS_CONTENT]: ContentPage,
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
      LearnImmersiveLayout,
      UpdateYourProfileModal,
    },
    mixins: [commonCoreStrings, commonLearnStrings, responsiveWindowMixin],
    data() {
      return {
        searchPageExitRoute: null,
        demographicInfo: null,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'canAccessUnassignedContent']),
      ...mapState('lessonPlaylist/resource', {
        lessonContent: 'content',
      }),
      ...mapState('classAssignments', {
        classroomName: state => state.currentClassroom.name,
      }),
      ...mapState('topicsTree', {
        topicsTreeContent: 'content',
        topicsTreeChannel: 'channel',
        topicsTreeTopic: 'topic',
      }),
      ...mapState('examReportViewer', ['exam']),
      ...mapState(['pageName']),
      userIsAuthorized() {
        return (
          (plugin_data.allowGuestAccess && this.$store.getters.allowAccess) || this.isUserLoggedIn
        );
      },
      currentPage() {
        return pageNameToComponentMap[this.pageName] || null;
      },
      currentPageIsTopic() {
        return [
          pageNameToComponentMap[PageNames.TOPICS_TOPIC],
          pageNameToComponentMap[PageNames.TOPICS_CHANNEL],
        ].includes(this.currentPage);
      },
      currentPageIsContentOrLesson() {
        return (
          this.pageName === PageNames.TOPICS_CONTENT ||
          this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER
        );
      },
      currentChannelIsCustom() {
        return (
          this.topicsTreeTopic &&
          this.topicsTreeTopic.options &&
          this.topicsTreeTopic.options.modality === 'CUSTOM_NAVIGATION'
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
        if (this.pageName === PageNames.SEARCH) {
          return {
            appBarTitle: this.coreString('searchLabel'),
            immersivePage: true,
            // Default to the Learn root page if there is no searchPageExitRoute to return to.
            immersivePageRoute:
              this.searchPageExitRoute || this.$router.getRoute(PageNames.TOPICS_ROOT),
            immersivePagePrimary: true,
            immersivePageIcon: 'close',
          };
        }
        if (this.pageName === PageNames.TOPICS_CHANNEL && this.currentChannelIsCustom) {
          return {
            appBarTitle: this.topicsTreeChannel.title || '',
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(PageNames.TOPICS_ROOT),
            immersivePagePrimary: false,
            immersivePageIcon: 'back',
          };
        }
        if (this.pageName === PageNames.TOPICS_CONTENT) {
          let immersivePageRoute = {};
          let appBarTitle;
          const { searchTerm, last } = this.$route.query;
          if (searchTerm) {
            appBarTitle = this.coreString('searchLabel');
            immersivePageRoute = this.$router.getRoute(PageNames.SEARCH, {}, this.$route.query);
          } else if (last) {
            // 'last' should only be route names for Recommended Page and its subpages
            immersivePageRoute = this.$router.getRoute(last);
            appBarTitle = {
              [PageNames.RECOMMENDED_POPULAR]: this.learnString('popularLabel'),
              [PageNames.RECOMMENDED_RESUME]: this.learnString('resumeLabel'),
              [PageNames.RECOMMENDED_NEXT_STEPS]: this.learnString('nextStepsLabel'),
              [PageNames.LIBRARY]: this.learnString('libraryLabel'),
            }[last];
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
          this.pageName === PageNames.TOPICS_CHANNEL
        ) {
          return {
            appBarTitle: this.coreString('browseChannel'),
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(PageNames.LIBRARY),
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
      showSearch() {
        return this.pageName !== PageNames.SEARCH && this.canAccessUnassignedContent;
      },
      topNavIsVisible() {
        return (
          this.pageName !== PageNames.CONTENT_UNAVAILABLE &&
          this.pageName !== PageNames.SEARCH &&
          !this.immersivePageProps.immersivePage
        );
      },
      content() {
        let content;
        if (this.pageName === PageNames.TOPICS_CONTENT) {
          content = this.topicsTreeContent;
        } else if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          content = this.lessonContent;
        }
        return content;
      },
      bottomSpaceReserved() {
        if (this.pageName === ClassesPageNames.EXAM_VIEWER) {
          return QUIZ_FOOTER;
        }
        let content;
        if (this.pageName === PageNames.RECOMMENDED_CONTENT) {
          content = this.topicsTreeContent;
        } else if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          content = this.lessonContent;
        }
        const isAssessment = content && content.assessment;
        // height of .attempts-container in AssessmentWrapper
        return isAssessment ? ASSESSMENT_FOOTER : 0;
      },
      maxWidth() {
        // ref: https://www.figma.com/file/zbxBoJUUkOynZtgK0wO9KD/Channel-descriptions?node-id=281%3A1270
        if (this.pageName !== PageNames.TOPICS_ROOT) return undefined;
        if (this.windowBreakpoint <= 1) return 400;
        return 1800;
      },
      profileNeedsUpdate() {
        return (
          this.demographicInfo &&
          (this.demographicInfo.gender === '' || this.demographicInfo.birth_year === '')
        );
      },
      userPluginUrl() {
        return urls['kolibri:kolibri.plugins.user:user'];
      },
      learnBackPageRoute() {
        // extract the key pieces of routing from immersive page props, but since we don't need
        // them all, just create two alternative route paths for return/'back' navigation
        let route = {};
        const { searchTerm } = this.$route.query;
        if (this.$route.query.last == PageNames.RECOMMENDED) {
          route = this.$router.getRoute(PageNames.RECOMMENDED);
        } else if (searchTerm) {
          route = this.$router.getRoute(PageNames.SEARCH, {}, this.$route.query);
        } else if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          route = this.$router.getRoute(ClassesPageNames.LESSON_PLAYLIST);
        } else if (this.topicsTreeContent.parent) {
          // Need to guard for parent being non-empty to avoid console errors
          route = this.$router.getRoute(PageNames.TOPICS_TOPIC, {
            id: this.topicsTreeContent.parent,
          });
        }
        return route;
      },
    },
    watch: {
      $route: function(newRoute, oldRoute) {
        const topicRouteNames = [
          PageNames.TOPICS_ROOT,
          PageNames.TOPICS_CHANNEL,
          PageNames.TOPICS_TOPIC,
        ];
        // If going from topic -> search, save the topic route parameters for the
        // exit link.
        // But, if we go from search -> content, we do not edit `searchPageExitRoute`
        // preserve the backwards linking from content -> search -> topic
        if (topicRouteNames.includes(oldRoute.name) && newRoute.name === PageNames.SEARCH) {
          this.searchPageExitRoute = {
            name: oldRoute.name,
            query: oldRoute.query,
            params: oldRoute.params,
          };
        } else if (oldRoute.name === PageNames.SEARCH && topicRouteNames.includes(newRoute.name)) {
          // If going from search -> topic (either by clicking "X" or clicking a topic card
          // in the results), clear out the exit route.
          this.searchPageExitRoute = null;
        }
      },
    },
    mounted() {
      if (this.isUserLoggedIn) {
        this.getDemographicInfo();
      }
    },
    methods: {
      getDemographicInfo() {
        return this.$store
          .dispatch('getDemographicInfo')
          .then(info => {
            this.demographicInfo = { ...info };
          })
          .catch(() => {});
      },
      handleCancelUpdateYourProfileModal() {
        this.$store.dispatch('deferProfileUpdates', this.demographicInfo);
        this.demographicInfo = null;
      },
      handleSubmitUpdateYourProfileModal() {
        if (this.userPluginUrl) {
          const url = `${this.userPluginUrl()}#/profile/edit?next_page=learn`;
          const redirect = () => {
            window.location.href = url;
          };
          this.$store
            .dispatch('deferProfileUpdates', this.demographicInfo)
            .then(redirect, redirect);
        }
      },
    },
    $trs: {
      examReportTitle: {
        message: '{examTitle} report',
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
