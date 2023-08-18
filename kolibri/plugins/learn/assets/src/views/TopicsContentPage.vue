<template>

  <div
    ref="mainWrapper"
    class="main-wrapper"
  >

    <div v-if="blockDoubleClicks" class="click-mask"></div>

    <SkipNavigationLink />
    <LearningActivityBar
      ref="activityBar"
      :resourceTitle="resourceTitle"
      :learningActivities="contentLearningActivities"
      :isLessonContext="lessonContext"
      :isQuiz="practiceQuiz"
      :showingReportState="contentProgress >= 1"
      :duration="contentDuration"
      :timeSpent="timeSpent"
      :isBookmarked="bookmark ? true : bookmark"
      :isCoachContent="isCoachContent"
      :contentProgress="contentProgress"
      :allowMarkComplete="allowMarkComplete"
      :contentKind="contentKind"
      :showBookmark="allowBookmark"
      :showDownloadButton="allowRemoteDownload"
      :isDownloading="isDownloading"
      :downloadingLoaderTooltip="downloadRequestsTranslator.$tr('downloadStartedLabel')"
      data-test="learningActivityBar"
      @navigateBack="navigateBack"
      @toggleBookmark="toggleBookmark"
      @download="handleRemoteDownloadRequest"
      @viewResourceList="toggleResourceList"
      @viewInfo="openSidePanel"
      @completionModal="openCompletionModal"
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
      v-else-if="!loading && content"
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
        :style="{
          backgroundColor: ( content.assessmentmetadata ? '' : $themeTokens.textInverted )
        }"
        :allowMarkComplete="allowMarkComplete"
        @mounted="contentPageMounted = true"
        @finished="$refs.activityBar && $refs.activityBar.animateNextSteps()"
        @error="onError"
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
        :canDownloadExternally="canDownloadExternally"
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
        :currentResourceID="currentResourceID"
        :missingLessonResources="missingLessonResources"
      />
    </SidePanelModal>
    <KModal
      v-if="showConnectionErrorModal"
      :title="deviceFormTranslator.$tr('errorCouldNotConnect')"
      :submitText="coreString('goBackAction')"
      @submit="goToAllLibraries"
    >
      <p>
        {{ learnString('cannotConnectToLibrary', { deviceName }) }}
      </p>
    </KModal>
  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import get from 'lodash/get';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import Modalities from 'kolibri-constants/Modalities';

  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import { ContentNodeResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { AddDeviceForm } from 'kolibri.coreVue.componentSets.sync';
  import { ContentNodeKinds, ContentErrorConstants } from 'kolibri.coreVue.vuex.constants';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import AppError from 'kolibri-common/components/AppError';
  import GlobalSnackbar from 'kolibri-common/components/GlobalSnackbar';
  import { PageNames, ClassesPageNames } from '../constants';
  import SkipNavigationLink from '../../../../../../kolibri/core/assets/src/views/SkipNavigationLink';
  import useContentLink from '../composables/useContentLink';
  import useCoreLearn from '../composables/useCoreLearn';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
  import useDevices from '../composables/useDevices';
  import useLearnerResources from '../composables/useLearnerResources';
  import useDownloadRequests from '../composables/useDownloadRequests';
  import commonLearnStrings from './commonLearnStrings';
  import SidePanelModal from './SidePanelModal';
  import LearningActivityChip from './LearningActivityChip';
  import CurrentlyViewedResourceMetadata from './CurrentlyViewedResourceMetadata';
  import ContentPage from './ContentPage';
  import LearningActivityBar from './LearningActivityBar';
  import AlsoInThis from './AlsoInThis';

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
    mixins: [responsiveWindowMixin, commonCoreStrings, commonLearnStrings],
    setup() {
      const { canDownloadExternally } = useCoreLearn();
      const {
        fetchContentNodeProgress,
        fetchContentNodeTreeProgress,
        contentNodeProgressMap,
      } = useContentNodeProgress();
      const { fetchLesson } = useLearnerResources();
      const { back, genExternalBackURL } = useContentLink();
      const { baseurl, deviceName } = useDevices();
      const {
        addDownloadRequest,
        isDownloadedByLearner,
        isDownloadingByLearner,
        downloadRequestsTranslator,
      } = useDownloadRequests();
      const deviceFormTranslator = crossComponentTranslator(AddDeviceForm);
      return {
        baseurl,
        deviceName,
        canDownloadExternally,
        contentNodeProgressMap,
        fetchContentNodeProgress,
        fetchContentNodeTreeProgress,
        fetchLesson,
        back,
        genExternalBackURL,
        addDownloadRequest,
        isDownloadedByLearner,
        isDownloadingByLearner,
        downloadRequestsTranslator,
        deviceFormTranslator,
      };
    },
    props: {
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
      deviceId: {
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
        lesson: null,
        showConnectionErrorModal: false,
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
        isCoachContent: state => (state.content && state.content.coach_content ? 1 : 0),
      }),
      contentProgress() {
        return this.content ? this.contentNodeProgressMap[this.content.content_id] : null;
      },
      contentKind() {
        return this.content ? this.content.kind : null;
      },
      contentDuration() {
        return this.content ? this.content.duration : null;
      },
      contentLearningActivities() {
        return this.content ? this.content.learning_activities : [];
      },
      loading() {
        return this.$store.state.core.loading;
      },
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
          ? this.$tr('nextInLesson')
          : this.content && this.content.ancestors.slice(-1)[0].title;
        /* eslint-enable */
      },
      timeSpent() {
        return this.contentPageMounted ? this.$refs.contentPage.time_spent : 0;
      },
      currentResourceID() {
        return this.content ? this.content.content_id : '';
      },
      missingLessonResources() {
        return this.lesson && this.lesson.resources.some(c => !c.contentnode);
      },
      isRemoteContent() {
        return Boolean(this.deviceId);
      },
      isDownloading() {
        return this.isDownloadingByLearner(this.content);
      },
      isDownloaded() {
        if (!this.content) return false;
        return this.content.admin_imported || this.isDownloadedByLearner(this.content);
      },
      allowRemoteDownload() {
        return this.isUserLoggedIn && this.isRemoteContent && !this.isDownloaded;
      },
      allowBookmark() {
        return this.isUserLoggedIn && (!this.isRemoteContent || this.isDownloaded);
      },
    },
    watch: {
      content(newContent, oldContent) {
        if ((newContent && !oldContent) || newContent.id !== oldContent.id) {
          this.initializeState();
        }
      },
      showViewResourcesSidePanel(newVal, oldVal) {
        if (newVal && !oldVal) {
          this.getSidebarInfo();
        }
      },
    },
    created() {
      this.initializeState();
    },
    methods: {
      initializeState() {
        this.bookmark = null;
        this.showViewResourcesSidePanel = false;
        this.nextContent = null;
        this.viewResourcesContents = [];
        this.resourcesSidePanelFetched = false;
        this.resourcesSidePanelLoading = false;
        if (this.content) {
          const id = this.content.id;
          client({
            method: 'get',
            url: urls['kolibri:core:bookmarks-list'](),
            params: { contentnode_id: this.content.id },
          }).then(response => {
            // As the component never gets fully torn down
            // this request could be stale. Only set bookmark
            // data in the case that the ids still match.
            if (this.content && this.content.id === id) {
              this.bookmark = response.data[0] || false;
            }
          });
        }
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
        return this.fetchLesson({ lessonId: this.lessonId }).then(lesson => {
          // Filter out this.content
          this.lesson = lesson;
          this.viewResourcesContents = lesson.resources
            .filter(n => n.contentnode)
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
        if (!this.content) {
          return Promise.resolve();
        }
        const fetchGrandparent = this.content.ancestors.length > 1;
        const treeParams = {
          id: fetchGrandparent ? this.content.ancestors.slice(-2)[0].id : this.content.parent,
          params: {
            include_coach_content:
              this.$store.getters.isAdmin ||
              this.$store.getters.isCoach ||
              this.$store.getters.isSuperuser,
            depth: fetchGrandparent ? 2 : 1,
            baseurl: this.baseurl,
          },
        };
        // Fetch and map the progress for the nodes if logged in
        if (this.$store.getters.isUserLoggedIn && !this.baseurl) {
          this.fetchContentNodeTreeProgress(treeParams);
        }
        return ContentNodeResource.fetchTree(treeParams).then(ancestor => {
          let parent;
          let nextContents;
          if (fetchGrandparent) {
            const parentIndex = ancestor.children.results.findIndex(
              c => c.id === this.content.parent
            );
            parent = ancestor.children.results[parentIndex];
            nextContents = ancestor.children.results.slice(parentIndex + 1);
          } else {
            parent = ancestor;
            const contentIndex = ancestor.children.results.findIndex(c => c.id === this.content.id);
            nextContents = ancestor.children.results.slice(contentIndex + 1);
          }
          this.nextContent = nextContents.find(c => c.kind === ContentNodeKinds.TOPIC) || null;
          this.viewResourcesContents = parent.children.results.filter(n => n.id);
        });
      },
      navigateBack() {
        if (PageNames[this.back.name] || ClassesPageNames[this.back.name]) {
          this.$router.push(this.back);
        } else {
          window.location.replace(this.genExternalBackURL());
        }
      },
      openSidePanel() {
        this.sidePanelContent = this.content;
      },
      toggleBookmark() {
        if (!this.content) {
          return;
        }
        if (this.bookmark) {
          client({
            method: 'delete',
            url: urls['kolibri:core:bookmarks_detail'](this.bookmark.id),
          }).then(() => {
            this.bookmark = false;
          });
        } else if (this.bookmark === false) {
          const id = this.content.id;
          client({
            method: 'post',
            url: urls['kolibri:core:bookmarks-list'](),
            data: {
              contentnode_id: id,
              user: this.currentUserId,
            },
          }).then(response => {
            if (this.content && this.content.id === id) {
              // Don't set a stale response if a user
              // navigated away before the bookmark finished.
              this.bookmark = response.data;
            }
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
      openCompletionModal() {
        if (this.$refs.contentPage) {
          this.$refs.contentPage.displayCompletionModal();
        }
      },
      handleRemoteDownloadRequest() {
        this.addDownloadRequest(this.content);
      },
      onError(error) {
        if (error && error.error === ContentErrorConstants.LOADING_ERROR && this.deviceId) {
          this.showConnectionErrorModal = true;
        }
      },
      goToAllLibraries() {
        this.$router.push({ name: PageNames.EXPLORE_LIBRARIES });
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
      nextInLesson: {
        message: 'Next in lesson',
        context: 'Refers to the next learning resource in a lesson.',
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
    overflow: hidden;

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
