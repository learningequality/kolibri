<template>

  <div
    ref="mainWrapper"
    class="main-wrapper"
  >
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
      :showDownloadButton="showDownloadButton"
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
          backgroundColor: content.assessmentmetadata ? '' : $themeTokens.textInverted,
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
          :class="
            $computedClass({
              '::after': {
                content: '',
                flex: 'auto',
              },
            })
          "
        >
          <LearningActivityChip
            class="chip"
            style="margin-bottom: 8px; margin-left: 8px"
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
        <h2 style="margin: 0">
          {{ viewResourcesTitle }}
        </h2>
      </template>
      <AlsoInThis
        style="margin-top: 8px"
        :contentNodes="viewResourcesContents"
        :nextFolder="nextFolder"
        :isLesson="lessonContext"
        :loading="resourcesSidePanelLoading"
        :currentResourceId="currentResourceId"
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

  import { mapState } from 'vuex';
  import { get, set } from '@vueuse/core';
  import lodashGet from 'lodash/get';
  import { getCurrentInstance, ref, watch } from 'kolibri.lib.vueCompositionApi';
  import Modalities from 'kolibri-constants/Modalities';

  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import { ContentNodeResource } from 'kolibri.resources';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { AddDeviceForm } from 'kolibri.coreVue.componentSets.sync';
  import { ContentNodeKinds, ContentErrorConstants } from 'kolibri.coreVue.vuex.constants';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import AppError from 'kolibri-common/components/AppError';
  import GlobalSnackbar from 'kolibri-common/components/GlobalSnackbar';
  import LearningActivityChip from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityChip.vue';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { PageNames, ClassesPageNames } from '../constants';
  import SkipNavigationLink from '../../../../../../kolibri/core/assets/src/views/SkipNavigationLink';
  import useChannels from '../composables/useChannels';
  import useContentLink from '../composables/useContentLink';
  import useCoreLearn from '../composables/useCoreLearn';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
  import {
    currentDeviceData,
    setCurrentDevice,
    StudioNotAllowedError,
  } from '../composables/useDevices';
  import useLearnerResources from '../composables/useLearnerResources';
  import useDownloadRequests from '../composables/useDownloadRequests';
  import commonLearnStrings from './commonLearnStrings';
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
    mixins: [commonCoreStrings, commonLearnStrings],
    setup(props) {
      const currentInstance = getCurrentInstance().proxy;
      const store = currentInstance.$store;
      const router = currentInstance.$router;
      const { canDownloadExternally, canAddDownloads } = useCoreLearn();
      const { fetchContentNodeProgress, fetchContentNodeTreeProgress, contentNodeProgressMap } =
        useContentNodeProgress();
      const { channelsMap, fetchChannels } = useChannels();
      const { fetchLesson } = useLearnerResources();
      const { back, genExternalBackURL } = useContentLink();
      const { baseurl, deviceName } = currentDeviceData();
      const {
        addDownloadRequest,
        downloadRequestMap,
        downloadRequestsTranslator,
        pollUserDownloadRequests,
        showCompletedDownloadSnackbar,
        loading: downloadRequestLoading,
      } = useDownloadRequests();
      const deviceFormTranslator = crossComponentTranslator(AddDeviceForm);
      const { currentUserId, isUserLoggedIn, isCoach, isAdmin, isSuperuser } = useUser();

      const channel = ref(null);
      const content = ref(null);
      const loading = ref(false);

      function _loadTopicsContent(shouldResolve, baseurl) {
        const id = props.id;
        return Promise.all([
          ContentNodeResource.fetchModel({ id, getParams: { baseurl } }),
          fetchChannels({ baseurl }),
        ]).then(
          ([fetchedContent]) => {
            if (shouldResolve()) {
              const currentChannel = channelsMap[fetchedContent.channel_id];
              if (!currentChannel) {
                router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
                return;
              }
              set(channel, currentChannel);
              set(content, fetchedContent);
              set(loading, false);
              store.commit('CORE_SET_ERROR', null);
            }
          },
          error => {
            shouldResolve()
              ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
              : null;
          },
        );
      }

      function showTopicsContent() {
        const deviceId = props.deviceId;
        set(loading, true);
        store.commit('SET_PAGE_NAME', PageNames.TOPICS_CONTENT);
        set(channel, null);
        set(content, null);
        const shouldResolve = samePageCheckGenerator(store);
        let promise;
        if (deviceId) {
          promise = setCurrentDevice(deviceId).then(device => {
            const baseurl = device.base_url;
            if (get(canAddDownloads)) {
              pollUserDownloadRequests({ contentnode_id: props.id });
            }
            return _loadTopicsContent(shouldResolve, baseurl);
          });
        } else {
          promise = _loadTopicsContent(shouldResolve);
        }
        return promise.catch(error => {
          if (shouldResolve()) {
            if (
              error === StudioNotAllowedError ||
              (error.response && error.response.status === 410)
            ) {
              router.replace({ name: PageNames.LIBRARY });
              return;
            }
            store.dispatch('handleApiError', { error, reloadOnReconnect: true });
          }
        });
      }

      watch(() => props.id, showTopicsContent);
      showTopicsContent();

      return {
        baseurl,
        deviceName,
        canDownloadExternally,
        contentNodeProgressMap,
        fetchContentNodeProgress,
        fetchContentNodeTreeProgress,
        fetchLesson,
        canAddDownloads,
        back,
        genExternalBackURL,
        addDownloadRequest,
        downloadRequestMap,
        downloadRequestsTranslator,
        deviceFormTranslator,
        content,
        channel,
        loading,
        downloadRequestLoading,
        isUserLoggedIn,
        isCoach,
        isAdmin,
        isSuperuser,
        currentUserId,
        showCompletedDownloadSnackbar,
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
      // Our linting doesn't detect usage in the setup function yet.
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      id: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        bookmark: null,
        sidePanelContent: null,
        showViewResourcesSidePanel: false,
        nextFolder: null,
        viewResourcesContents: [],
        resourcesSidePanelFetched: false,
        resourcesSidePanelLoading: false,
        contentPageMounted: false,
        lesson: null,
        showConnectionErrorModal: false,
      };
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      isCoachContent() {
        return this.content && this.content.coach_content ? 1 : 0;
      },
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
      practiceQuiz() {
        return lodashGet(this, ['content', 'options', 'modality']) === Modalities.QUIZ;
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
        return lodashGet(
          this,
          ['content', 'options', 'completion_criteria', 'learner_managed'],
          false,
        );
      },
      lessonContext() {
        return Boolean(this.lessonId);
      },
      lessonId() {
        return lodashGet(this.back, 'params.lessonId', null);
      },
      classId() {
        return lodashGet(this.back, 'params.classId', null);
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
      currentResourceId() {
        return this.content ? this.content.id : '';
      },
      missingLessonResources() {
        return this.lesson && this.lesson.resources.some(c => !c.contentnode);
      },
      isRemoteContent() {
        return Boolean(this.deviceId);
      },
      allowDownloads() {
        return this.isUserLoggedIn && this.canAddDownloads && this.isRemoteContent;
      },
      downloadRequestedByLearner() {
        return this.allowDownloads && Boolean(this.downloadRequestMap[this.content?.id]);
      },
      downloadableByLearner() {
        return this.allowDownloads && !this.content?.admin_imported;
      },
      isDownloading() {
        return (
          this.downloadRequestedByLearner &&
          this.downloadRequestMap[this.content.id].status === 'PENDING'
        );
      },
      isDownloaded() {
        return (
          this.content?.admin_imported ||
          (this.downloadRequestedByLearner &&
            this.downloadRequestMap[this.content?.id]?.status === 'COMPLETED')
        );
      },
      showDownloadButton() {
        return (
          this.downloadableByLearner &&
          !this.downloadRequestLoading &&
          !this.loading &&
          !this.isDownloaded
        );
      },
      allowBookmark() {
        return this.isUserLoggedIn && (!this.isRemoteContent || this.isDownloaded);
      },
    },
    watch: {
      content(newContent, oldContent) {
        if (newContent && (!oldContent || newContent.id !== oldContent.id)) {
          this.initializeState();
        }
      },
      showViewResourcesSidePanel(newVal, oldVal) {
        if (newVal === true) {
          this.stopMainScroll(true);
        } else {
          this.stopMainScroll(false);
        }
        if (newVal && !oldVal) {
          this.getSidebarInfo();
        }
      },
      sidePanelContent(newVal) {
        if (newVal !== null) {
          this.stopMainScroll(true);
        } else {
          this.stopMainScroll(false);
        }
      },
      isDownloading(newVal) {
        if (newVal === false && this.isDownloaded) {
          this.showCompletedDownloadSnackbar();
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
        this.nextFolder = null;
        this.viewResourcesContents = [];
        this.resourcesSidePanelFetched = false;
        this.resourcesSidePanelLoading = false;
        if (this.content) {
          const id = this.content.id;
          if (!this.isUserLoggedIn && (this.lessonId || this.classId)) {
            this.$router.replace({ ...this.$route, query: null });
          }
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
       * @modifies this.nextFolder - Sets the value with this.content's parents next sibling folder
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
            include_coach_content: this.isAdmin || this.isCoach || this.isSuperuser,
            depth: fetchGrandparent ? 2 : 1,
            baseurl: this.baseurl,
          },
        };
        // Fetch and map the progress for the nodes if logged in
        if (this.isUserLoggedIn && !this.baseurl) {
          this.fetchContentNodeTreeProgress(treeParams);
        }
        return ContentNodeResource.fetchTree(treeParams).then(ancestor => {
          let parent;
          let nextFolders;
          if (fetchGrandparent) {
            const parentIndex = ancestor.children.results.findIndex(
              c => c.id === this.content.parent,
            );
            parent = ancestor.children.results[parentIndex];
            nextFolders = ancestor.children.results.slice(parentIndex + 1);
          } else {
            parent = ancestor;
            const contentIndex = ancestor.children.results.findIndex(c => c.id === this.content.id);
            nextFolders = ancestor.children.results.slice(contentIndex + 1);
          }
          this.nextFolder = nextFolders.find(c => c.kind === ContentNodeKinds.TOPIC) || null;
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
      stopMainScroll(sidePanelVisible) {
        const mainWrapperElement = this.$refs.mainWrapper;
        if (sidePanelVisible) {
          mainWrapperElement.style.position = 'fixed';
        } else {
          mainWrapperElement.style.position = null;
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
    margin-top: 8px;
    margin-left: -8px;
  }

  .chip {
    margin-bottom: 8px;
    margin-left: 8px;
  }

  .header-content h2 {
    position: absolute;
    top: 50%;
    text-align: left;
    transform: translate(0, -50%);
  }

</style>
