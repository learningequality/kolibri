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
      :showingReportState="contentProgress >= 1"
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
        ref="contentPage"
        class="content"
        data-test="contentPage"
        :content="content"
        :lessonId="lessonId"
        :style="{ backgroundColor: ( content.assessment ? '' : $themeTokens.textInverted ) }"
        @mounted="contentPageMounted = true"
      />
    </div>

    <GlobalSnackbar />

    <!-- Side Panel for content metadata -->
    <SidePanelModal
      v-if="sidePanelContent"
      ref="resourcePanel"
      alignment="right"
      closeButtonIconType="close"
      @closePanel="sidePanelContent = null"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <template #header>
        <!-- Flex styles tested in ie11 and look good. Ensures good spacing between
            multiple chips - not a common thing but just in case -->
        <div
          v-for="activity in sidePanelContent.learning_activities"
          :key="activity"
          class="side-panel-chips"
          :class="$computedClass({ '::after': {
            content: '',
            flex: 'auto'
          } })"
        >
          <LearningActivityChip
            class="chip"
            style="margin-left: 8px; margin-bottom: 8px;"
            :kind="activity"
          />
        </div>
      </template>
      <CurrentlyViewedResourceMetadata
        :content="sidePanelContent"
        :canDownloadContent="canDownload"
      />
    </SidePanelModal>

    <!-- Side Panel for "view resources" or "lesson resources" -->
    <SidePanelModal
      v-if="showViewResourcesSidePanel"
      ref="resourcePanel"
      class="also-in-this-side-panel"
      alignment="right"
      closeButtonIconType="close"
      @closePanel="showViewResourcesSidePanel = false"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <template #header>
        <h2 style="margin: 0;">
          {{ viewResourcesTitle }}
        </h2>
      </template>
      <AlsoInThis
        style="margin-top: 8px"
        :contentNodes="viewResourcesContents"
        :nextContent="nextContent"
        :isLesson="lessonContext"
        :loading="resourcesSidePanelLoading"
      />
    </SidePanelModal>

  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import get from 'lodash/get';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import Modalities from 'kolibri-constants/Modalities';

  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import SidePanelModal from 'kolibri.coreVue.components.SidePanelModal';
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
  import { PageNames } from '../constants';
  import LearningActivityChip from './LearningActivityChip';
  import LessonResourceViewer from './classes/LessonResourceViewer';
  import CurrentlyViewedResourceMetadata from './CurrentlyViewedResourceMetadata';
  import ContentPage from './ContentPage';
  import LearningActivityBar from './LearningActivityBar';
  import AlsoInThis from './AlsoInThis';

  const lessonStrings = crossComponentTranslator(LessonResourceViewer);

  export default {
    name: 'TopicsContentPage',
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
      SidePanelModal,
      GlobalSnackbar,
      LearningActivityBar,
      LearningActivityChip,
      CurrentlyViewedResourceMetadata,
      SkipNavigationLink,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const { canDownload } = useCoreLearn();
      const {
        fetchContentNodeProgress,
        fetchContentNodeTreeProgress,
        contentNodeProgressMap,
      } = useContentNodeProgress();
      const { fetchLesson } = useLearnerResources();
      return {
        canDownload,
        contentNodeProgressMap,
        fetchContentNodeProgress,
        fetchContentNodeTreeProgress,
        fetchLesson,
      };
    },
    props: {
      loading: {
        type: Boolean,
        required: false,
        default: true,
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
        contentPageMounted: false,
      };
    },
    computed: {
      ...mapGetters(['currentUserId', 'isUserLoggedIn']),
      ...mapState({
        error: state => state.core.error,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
      }),
      ...mapState('topicsTree', ['content']),
      ...mapState('topicsTree', {
        isCoachContent: state => (state.content.coach_content ? 1 : 0),
      }),
      practiceQuiz() {
        return get(this, ['content', 'options', 'modality']) === Modalities.QUIZ;
      },
      contentProgress() {
        return this.contentNodeProgressMap[this.content.content_id];
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
          : this.content && this.content.ancestors.slice(-1)[0].title;
        /* eslint-enable */
      },
      timeSpent() {
        return this.contentPageMounted ? this.$refs.contentPage.time_spent : 0;
      },
      back() {
        if (!this.$route) {
          return null;
        }
        const query = { ...this.$route.query };
        const lastPage = (this.$route.query || {}).last;
        delete query.last;
        delete query.topicId;
        // returning to a topic page requires an id
        if (lastPage === PageNames.TOPICS_TOPIC_SEARCH || lastPage === PageNames.TOPICS_TOPIC) {
          const lastId = this.$route.query.topicId
            ? this.$route.query.topicId
            : this.content.parent;
          // Need to guard for parent being non-empty to avoid console errors
          return this.$router.getRoute(
            lastPage,
            {
              id: lastId,
            },
            query
          );
        } else if (lastPage === PageNames.LIBRARY) {
          return this.$router.getRoute(lastPage, {}, query);
        } else if (lastPage) {
          return this.$router.getRoute(lastPage, query);
        } else {
          return this.$router.getRoute(PageNames.HOME);
        }
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
          if (promise) {
            promise.then(() => {
              this.resourcesSidePanelLoading = false;
              this.resourcesSidePanelFetched = true;
            });
          }
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
            .filter(n => n.contentnode && n.contentnode_id !== this.content.id)
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
      findFirstEl() {
        if (this.$refs.embeddedPanel) {
          this.$refs.embeddedPanel.focusFirstEl();
        } else {
          this.$refs.resourcePanel.focusFirstEl();
        }
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

  .side-panel-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-bottom: -8px;
    margin-left: -8px;
  }

  .chip {
    margin-bottom: 8px;
    margin-left: 8px;
  }

</style>
