<template>

  <CoreBase
    :marginBottom="bottomSpaceReserved"
    :showSubNav="topNavIsVisible"
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
    v-bind="immersivePageProps"
  >
    <template slot="app-bar-actions">
      <ActionBarSearchBox v-if="showSearch" />
    </template>

    <LearnTopNav slot="sub-nav" />

    <TotalPoints slot="totalPointsMenuItem" />

    <div>
      <Breadcrumbs v-if="pageName !== 'TOPICS_CONTENT'" />
      <component :is="currentPage" />
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
  import { redirectBrowser } from 'kolibri.utils.browser';
  import lastItem from 'lodash/last';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { PageNames, ClassesPageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import ChannelsPage from './ChannelsPage';
  import TopicsPage from './TopicsPage';
  import ContentPage from './ContentPage';
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
  import { ASSESSMENT_FOOTER, QUIZ_FOOTER } from './footers.js';
  import UpdateYourProfileModal from './UpdateYourProfileModal';

  const pageNameToComponentMap = {
    [PageNames.TOPICS_ROOT]: ChannelsPage,
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
      UpdateYourProfileModal,
    },
    mixins: [commonCoreStrings, commonLearnStrings, responsiveWindowMixin],
    data() {
      return {
        lastRoute: null,
        demographicInfo: null,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'facilityConfig', 'canAccessUnassignedContent']),
      ...mapState('lessonPlaylist/resource', {
        lessonContent: 'content',
        currentLesson: 'currentLesson',
      }),
      ...mapState('classAssignments', {
        classroomName: state => state.currentClassroom.name,
      }),
      ...mapState('topicsTree', {
        topicsTreeContent: 'content',
        topicsTreeChannel: 'channel',
      }),
      ...mapState('examReportViewer', ['exam']),
      ...mapState(['pageName']),
      userIsAuthorized() {
        return this.facilityConfig.allow_guest_access || this.isUserLoggedIn;
      },
      currentPage() {
        return pageNameToComponentMap[this.pageName] || null;
      },
      immersivePageProps() {
        if (this.pageName === ClassesPageNames.EXAM_VIEWER) {
          return {
            appBarTitle: this.classroomName || '',
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(ClassesPageNames.CLASS_ASSIGNMENTS),
            immersivePagePrimary: true,
            immersivePageIcon: 'arrow_back',
          };
        }
        if (this.pageName === ClassesPageNames.LESSON_RESOURCE_VIEWER) {
          return {
            appBarTitle: this.currentLesson.title || '',
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(ClassesPageNames.LESSON_PLAYLIST),
            immersivePagePrimary: true,
            immersivePageIcon: 'arrow_back',
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
            // Default to the Learn root page if there is no lastRoute to return to.
            immersivePageRoute: this.lastRoute || this.$router.getRoute(PageNames.TOPICS_ROOT),
            immersivePagePrimary: true,
            immersivePageIcon: 'arrow_back',
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
            const trString = {
              [PageNames.RECOMMENDED_POPULAR]: 'documentTitleForPopular',
              [PageNames.RECOMMENDED_RESUME]: 'documentTitleForResume',
              [PageNames.RECOMMENDED_NEXT_STEPS]: 'documentTitleForNextSteps',
              [PageNames.RECOMMENDED]: 'recommended',
            }[last];
            appBarTitle = this.$tr(trString);
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
            immersivePagePrimary: true,
            immersivePageIcon: 'arrow_back',
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
      bottomSpaceReserved() {
        if (this.pageName === ClassesPageNames.EXAM_VIEWER) {
          return QUIZ_FOOTER;
        }
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
        return isAssessment ? ASSESSMENT_FOOTER : 0;
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
    },
    watch: {
      $route: function(newRoute, oldRoute) {
        // Return if the user is leaving or entering the Search page.
        // This ensures we never set this.lastRoute to be any kind of
        // SEARCH route and avoids infinite loops.
        if (newRoute.name === 'SEARCH' || oldRoute.name === 'SEARCH') {
          return;
        }

        // Destructure the oldRoute into an object with 3 specific properties.
        // Setting this.lastRoute = oldRoute causes issues for some reason.
        this.lastRoute = {
          name: oldRoute.name,
          query: oldRoute.query,
          params: oldRoute.params,
        };
      },
    },
    mounted() {
      if (this.isUserLoggedIn) {
        this.$store
          .dispatch('getDemographicInfo')
          .then(info => {
            this.demographicInfo = { ...info };
          })
          .catch(() => {});
      }
    },
    methods: {
      handleCancelUpdateYourProfileModal() {
        this.$store.dispatch('deferProfileUpdates', this.demographicInfo);
        this.demographicInfo = null;
      },
      handleSubmitUpdateYourProfileModal() {
        if (this.userPluginUrl) {
          const redirect = () => redirectBrowser(`${this.userPluginUrl()}#/profile/edit`);
          this.$store
            .dispatch('deferProfileUpdates', this.demographicInfo)
            .then(redirect, redirect);
        }
      },
    },
    $trs: {
      examReportTitle: '{examTitle} report',
      recommended: 'Recommended',
      documentTitleForPopular: 'Popular',
      documentTitleForResume: 'Resume',
      documentTitleForNextSteps: 'Next Steps',
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';

  .content {
    margin: auto;
  }

</style>
