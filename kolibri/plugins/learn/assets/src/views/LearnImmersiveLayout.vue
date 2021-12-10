<template>

  <div
    v-if="!loading"
    ref="mainWrapper"
    class="main-wrapper"
  >

    <div v-if="blockDoubleClicks" class="click-mask"></div>
    <SkipNavigationLink />
    <LearningActivityBar
      :resourceTitle="resourceTitle"
      :learningActivities="content.learning_activities"
      :isLessonContext="lessonContext"
      :isQuiz="practiceQuiz"
      :showingReportState="currentlyMastered"
      :duration="content.duration"
      :timeSpent="timeSpent"
      :isBookmarked="bookmark ? true : bookmark"
      :isCoachContent="isCoachContent"
      :contentProgress="contentProgress"
      :allowMarkComplete="allowMarkComplete"
      :contentKind="content.kind"
      :showBookmark="isUserLoggedIn"
      data-test="learningActivityBar"
      @navigateBack="navigateBack"
      @toggleBookmark="toggleBookmark"
      @viewResourceList="toggleResourceList"
      @viewInfo="openSidePanel"
    />
    <KLinearLoader
      v-if="loading"
      class="loader"
      type="indeterminate"
      :delay="false"
    />
    <KPageContainer v-if="notAuthorized">
      <AuthMessage
        :authorizedRole="authorizedRole"
        :header="authorizationErrorHeader"
        :details="authorizationErrorDetails"
      />
    </KPageContainer>
    <KPageContainer v-else-if="error">
      <AppError />
    </KPageContainer>

    <div
      v-else
      id="main"
      role="main"
      tabindex="-1"
      class="main"
    >
      <ContentPage
        class="content"
        data-test="contentPage"
        :content="content"
        :lessonId="lessonId"
        :style="{ backgroundColor: ( content.assessment ? '' : $themeTokens.textInverted ) }"
      />
    </div>

    <GlobalSnackbar />

    <!-- Side Panel for content metadata -->
    <FullScreenSidePanel
      v-if="sidePanelContent"
      @closePanel="sidePanelContent = null"
    >
      <CurrentlyViewedResourceMetadata
        :content="sidePanelContent"
        :canDownloadContent="canDownload"
      />
    </FullScreenSidePanel>

    <!-- Side Panel for "view resources" or "lesson resources" -->
    <FullScreenSidePanel
      v-if="showViewResourcesSidePanel"
      class="also-in-this-side-panel"
      @closePanel="showViewResourcesSidePanel = false"
    >
      <AlsoInThis
        :contentNodes="viewResourcesContents"
        :nextContent="nextContent"
        :title="viewResourcesTitle"
        :isLesson="lessonContext"
        :loading="resourcesSidePanelLoading"
      />
    </FullScreenSidePanel>

  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import get from 'lodash/get';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import Modalities from 'kolibri-constants/Modalities';

  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import { ContentNodeResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import GlobalSnackbar from '../../../../../../kolibri/core/assets/src/views/GlobalSnackbar';
  import SkipNavigationLink from '../../../../../../kolibri/core/assets/src/views/SkipNavigationLink';
  import AppError from '../../../../../../kolibri/core/assets/src/views/AppError';
  import useCoreLearn from '../composables/useCoreLearn';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
  import useLearnerResources from '../composables/useLearnerResources';
  import LessonResourceViewer from './classes/LessonResourceViewer';
  import CurrentlyViewedResourceMetadata from './CurrentlyViewedResourceMetadata';
  import ContentPage from './ContentPage';
  import LearningActivityBar from './LearningActivityBar';
  import AlsoInThis from './AlsoInThis';

  const sidepanelStrings = crossComponentTranslator(FullScreenSidePanel);
  const lessonStrings = crossComponentTranslator(LessonResourceViewer);

  export default {
    name: 'LearnImmersiveLayout',
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('kolibriTitleMessage', { title: this.$tr('errorPageTitle') });
          }
          if (!title) {
            // If no child component sets title, it reads 'Kolibri'
            return this.coreString('kolibriLabel');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
        title: this.pageTitle,
      };
    },
    components: {
      AlsoInThis,
      AppError,
      AuthMessage,
      ContentPage,
      FullScreenSidePanel,
      GlobalSnackbar,
      LearningActivityBar,
      CurrentlyViewedResourceMetadata,
      SkipNavigationLink,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const { canDownload } = useCoreLearn();
      const { fetchContentNodeProgress, fetchContentNodeTreeProgress } = useContentNodeProgress();
      const { fetchLesson } = useLearnerResources();
      return { canDownload, fetchContentNodeProgress, fetchContentNodeTreeProgress, fetchLesson };
    },
    props: {
      content: {
        type: Object,
        required: false,
        default: null,
      },
      // AUTHORIZATION SPECIFIC
      authorized: {
        type: Boolean,
        required: false,
        default: true,
      },
      authorizedRole: {
        type: String,
        default: null,
      },
      // link to where the 'back' button should go
      back: {
        type: Object,
        required: true,
        default: null,
      },
    },
    data() {
      return {
        bookmark: null,
        sidePanelContent: null,
        showViewResourcesSidePanel: false,
        nextContent: null,
        viewResourcesContents: [],
        resourcesSidePanelFetched: false,
        resourcesSidePanelLoading: false,
      };
    },
    computed: {
      ...mapGetters(['currentUserId', 'isUserLoggedIn']),
      ...mapState({
        contentProgress: state => state.core.logging.progress,
        currentlyMastered: state => state.core.logging.complete,
        error: state => state.core.error,
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
        timeSpent: state => state.core.logging.time_spent,
      }),
      ...mapState('topicsTree', {
        isCoachContent: state => (state.content.coach_content ? 1 : 0),
      }),
      practiceQuiz() {
        return get(this, ['content', 'options', 'modality']) === Modalities.QUIZ;
      },
      notAuthorized() {
        // catch "not authorized" error, display AuthMessage
        if (
          this.error &&
          this.error.response &&
          this.error.response.status &&
          this.error.response.status == 403
        ) {
          return true;
        }
        return !this.authorized;
      },
      resourceTitle() {
        return this.content ? this.content.title : '';
      },
      allowMarkComplete() {
        return get(this, ['content', 'options', 'completion_criteria', 'learner_managed'], false);
      },
      lessonContext() {
        return Boolean(this.lessonId);
      },
      lessonId() {
        return get(this.back, 'params.lessonId', null);
      },
      viewResourcesTitle() {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        return this.lessonContext
          ? lessonStrings.$tr('nextInLesson')
          : sidepanelStrings.$tr('topicHeader');
        /* eslint-enable */
      },
    },
    watch: {
      content(newContent, oldContent) {
        if ((newContent && !oldContent) || newContent.id !== oldContent.id) {
          this.resetSidebarInfo();
          client({
            method: 'get',
            url: urls['kolibri:core:bookmarks-list'](),
            params: { contentnode_id: this.content.id },
          }).then(response => {
            this.bookmark = response.data[0] || false;
          });
        }
      },
      showViewResourcesSidePanel(newVal, oldVal) {
        if (newVal && !oldVal) {
          this.getSidebarInfo();
        }
      },
    },
    methods: {
      resetSidebarInfo() {
        this.showViewResourcesSidePanel = false;
        this.nextContent = null;
        this.viewResourcesContents = [];
        this.resourcesSidePanelFetched = false;
        this.resourcesSidePanelLoading = false;
      },
      getSidebarInfo() {
        if (!this.resourcesSidePanelFetched && !this.resourcesSidePanelLoading) {
          this.resourcesSidePanelLoading = true;
          let promise = Promise.resolve();
          if (this.lessonId) {
            promise = this.fetchLessonSiblings();
          } else if (this.content && this.content.id) {
            promise = this.fetchSiblings();
          }
          promise.then(() => {
            this.resourcesSidePanelLoading = false;
            this.resourcesSidePanelFetched = true;
          });
        }
      },
      /**
       * When a lessonId is given, this method will fetch the lesson and then fetch its
       * content nodes. The user is guaranteed to be logged in if there is a lessonId.
       *
       * The nodes' progresses are mapped via the useContentNodeProgress composable
       *
       * @modifies this.viewResourcesContents - Assigned the content nodes retrieved
       * @modifies useContentNodeProgress.contentNodeProgressMap (indirectly)
       */
      fetchLessonSiblings() {
        // Get the lesson and then assign its resources to this.viewResourcesContents
        // fetchLesson also handles fetching the progress data for this lesson and
        // the content node data for the resources
        this.fetchLesson({ lessonId: this.lessonId }).then(lesson => {
          // Filter out this.content
          this.viewResourcesContents = lesson.resources
            .filter(n => n.contentnode_id !== this.content.id)
            .map(n => n.contentnode);
        });
      },
      /**
       * Prepares a list of content nodes which are children of this.content.parent without
       * this.content and calls fetchContentNodeProgress when the user is logged in.
       *
       * Then it will fetch the "next folder" - which is the next content for this.content that
       * is a topic.
       *
       * @modifies this.viewResourcesContents - Sets it to the progress-mapped nodes
       * @modifies this.nextContent - Sets the value with this.content's parents next sibling folder
       * if found
       * @modifies useContentNodeProgress.contentNodeProgressMap (indirectly) if the user
       * is logged in
       */
      fetchSiblings() {
        // Fetch the next content
        const nextPromise = ContentNodeResource.fetchNextContent(this.content.parent, {
          topicOnly: true,
        }).then(nextContent => {
          // This may return the immediate parent if nothing else is found so let's be sure
          // not to assign that
          if (nextContent && this.content.parent !== nextContent.id) {
            this.nextContent = nextContent;
          }
        });
        const treeParams = {
          id: this.content.parent,
          params: {
            include_coach_content:
              this.$store.getters.isAdmin ||
              this.$store.getters.isCoach ||
              this.$store.getters.isSuperuser,
            depth: 1,
          },
        };
        // Fetch and map the progress for the nodes if logged in
        if (this.$store.getters.isUserLoggedIn) {
          this.fetchContentNodeTreeProgress(treeParams);
        }
        const treePromise = ContentNodeResource.fetchTree(treeParams).then(parent => {
          // Filter out this.content
          this.viewResourcesContents = parent.children.results.filter(
            n => n.id !== this.content.id
          );
        });
        return Promise.all([nextPromise, treePromise]);
      },
      navigateBack() {
        this.$router.push(this.back);
      },
      openSidePanel() {
        this.sidePanelContent = this.content;
      },
      toggleBookmark() {
        if (this.bookmark) {
          client({
            method: 'delete',
            url: urls['kolibri:core:bookmarks_detail'](this.bookmark.id),
          }).then(() => {
            this.bookmark = false;
          });
        } else if (this.bookmark === false) {
          client({
            method: 'post',
            url: urls['kolibri:core:bookmarks-list'](),
            data: {
              contentnode_id: this.content.id,
              user: this.currentUserId,
            },
          }).then(response => {
            this.bookmark = response.data;
          });
        }
      },
      toggleResourceList() {
        this.showViewResourcesSidePanel = true;
      },
    },
    $trs: {
      kolibriTitleMessage: {
        message: '{ title } - Kolibri',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      errorPageTitle: {
        message: 'Error',
        context:
          "When Kolibri throws an error, this is the text that's used as the title of the error page. The description of the error follows below.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .main-wrapper {
    display: inline-block;
    width: 100%;

    @media print {
      /* Without this, things won't print correctly
       *  - Firefox: Tables will get cutoff
       *  - Chrome: Table header won't repeat correctly on each page
       */
      display: block;
    }
  }

  // When focused by SkipNavigationLink, don't outline non-buttons/links
  /deep/ [tabindex='-1'] {
    outline-style: none !important;
  }

  .click-mask {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
  }

  .loader {
    position: fixed;
    right: 0;
    left: 0;
  }

  .also-in-this-side-panel {
    /deep/ .side-panel {
      padding-bottom: 0;
    }
  }

</style>
