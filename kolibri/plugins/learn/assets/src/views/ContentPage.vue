<template>

  <div>
    <template v-if="sessionReady">
      <ContentRenderer
        v-if="!content.assessmentmetadata"
        class="content-renderer"
        :kind="content.kind"
        :lang="content.lang"
        :files="content.files"
        :options="content.options"
        :available="content.available"
        :duration="content.duration"
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateProgress="updateProgress"
        @addProgress="addProgress"
        @updateContentState="updateContentState"
        @navigateTo="navigateTo"
        @error="onError"
        @finished="onFinished"
      />
      <QuizRenderer
        v-else-if="practiceQuiz || survey"
        class="content-renderer"
        :style="{ paddingBottom: windowIsSmall ? '80px' : '0px' }"
        :content="content"
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        :pastattempts="pastattempts"
        :mastered="complete"
        :masteryLevel="masteryLevel"
        :updateContentSession="updateContentSession"
        :isSurvey="survey"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateInteraction="updateInteraction"
        @updateProgress="updateProgress"
        @updateContentState="updateContentState"
        @repeat="repeat"
        @error="onError"
        @finished="onFinished"
      />
      <AssessmentWrapper
        v-else
        class="content-renderer"
        :kind="content.kind"
        :files="content.files"
        :lang="content.lang"
        :randomize="content.assessmentmetadata.randomize"
        :masteryModel="content.assessmentmetadata.mastery_model"
        :assessmentIds="content.assessmentmetadata.assessment_item_ids"
        :available="content.available"
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        :pastattempts="pastattempts"
        :mastered="complete"
        :totalattempts="totalattempts"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateInteraction="updateInteraction"
        @updateProgress="updateProgress"
        @updateContentState="updateContentState"
        @error="onError"
        @finished="onFinished"
      />
    </template>

    <CompletionModal
      v-if="showCompletionModal"
      ref="completionModal"
      :isUserLoggedIn="isUserLoggedIn"
      :contentNode="content"
      :lessonId="lessonId"
      :isQuiz="practiceQuiz"
      :isSurvey="survey"
      :wasComplete="wasComplete"
      @close="hideCompletionModal"
      @shouldFocusFirstEl="findFirstEl()"
    />

    <MarkAsCompleteModal
      v-if="showCompleteContentModal && allowMarkComplete"
      @complete="handleMarkAsComplete"
      @cancel="hideMarkAsCompleteModal"
    />
  </div>

</template>


<script>

  import get from 'lodash/get';
  import { mapState } from 'vuex';
  import { ref } from 'vue';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import router from 'kolibri/router';
  import Modalities from 'kolibri-constants/Modalities';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { setContentNodeProgress } from '../composables/useContentNodeProgress';
  import useProgressTracking from '../composables/useProgressTracking';
  import useContentLink from '../composables/useContentLink';
  import AssessmentWrapper from './AssessmentWrapper';
  import commonLearnStrings from './commonLearnStrings';
  import CompletionModal from './CompletionModal';
  import QuizRenderer from './QuizRenderer';
  import MarkAsCompleteModal from './MarkAsCompleteModal';

  export default {
    name: 'ContentPage',
    metaInfo() {
      return {
        title: this.learnString('documentTitle', {
          contentTitle: this.content.title,
          channelTitle: this.content.ancestors[0] ? this.content.ancestors[0].title : '',
        }),
      };
    },
    components: {
      AssessmentWrapper,
      CompletionModal,
      QuizRenderer,
      MarkAsCompleteModal,
    },
    mixins: [commonLearnStrings],
    setup() {
      const {
        progress,
        time_spent,
        extra_fields,
        pastattempts,
        complete,
        totalattempts,
        initContentSession,
        updateContentSession,
        startTrackingProgress,
        stopTrackingProgress,
      } = useProgressTracking();
      const { genContentLinkKeepCurrentBackLink } = useContentLink();
      const errored = ref(false);
      const wrappedUpdateContentSession = data => {
        if (!errored.value) {
          return updateContentSession(data);
        }
        return Promise.resolve();
      };
      const { windowIsSmall } = useKResponsiveWindow();
      const { isUserLoggedIn, currentUserId, full_name } = useUser();
      const { createSnackbar } = useSnackbar();
      return {
        errored,
        progress,
        time_spent,
        extra_fields,
        pastattempts,
        complete,
        totalattempts,
        initContentSession,
        updateContentSession: wrappedUpdateContentSession,
        startTracking: startTrackingProgress,
        stopTracking: stopTrackingProgress,
        genContentLinkKeepCurrentBackLink,
        windowIsSmall,
        isUserLoggedIn,
        currentUserId,
        full_name,
        createSnackbar,
      };
    },
    props: {
      content: {
        type: Object,
        required: true,
        validator(val) {
          return val.kind && val.content_id;
        },
      },
      // only present when the content node is being viewed as part of lesson
      lessonId: {
        type: String,
        required: false,
        default: null,
      },
      /**
       * Does a resource have the option to be
       * manually marked as complete?
       */
      allowMarkComplete: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        showCompletionModal: false,
        wasComplete: false,
        sessionReady: false,
        fullName: this.full_name,
      };
    },
    computed: {
      ...mapState(['showCompleteContentModal']),
      practiceQuiz() {
        return get(this, ['content', 'options', 'modality']) === Modalities.QUIZ;
      },
      survey() {
        return get(this, ['content', 'options', 'modality']) === Modalities.SURVEY;
      },
      masteryLevel() {
        return get(this, ['context', 'mastery_level']);
      },
    },
    watch: {
      progress() {
        // Ensure that our cached progress and tracked progress always stay up to date
        this.cacheProgress();
      },
    },
    created() {
      return this.initSession();
    },
    mounted() {
      this.$emit('mounted');
    },
    methods: {
      /*
       * Update the progress of the content node in the shared progress store
       * in the useContentNodeProgress composable. Do this to have a single
       * source of truth for referencing progress of content nodes.
       */
      cacheProgress() {
        setContentNodeProgress({ content_id: this.content.content_id, progress: this.progress });
      },
      updateInteraction({ progress, interaction }) {
        this.updateContentSession({ progress, interaction });
      },
      updateProgress(progress) {
        return this.updateContentSession({ progress });
      },
      addProgress(progressDelta) {
        this.updateContentSession({ progressDelta });
      },
      updateContentState(contentState) {
        this.updateContentSession({ contentState });
      },
      hideMarkAsCompleteModal() {
        this.$store.commit('SET_SHOW_COMPLETE_CONTENT_MODAL', false);
      },
      handleMarkAsComplete() {
        this.hideMarkAsCompleteModal();
        // Do this immediately to remove any delay
        // before the completion modal displays if appropriate.
        this.displayCompletionModal();
        return this.updateProgress(1.0)
          .then(() => {
            this.createSnackbar(this.learnString('resourceCompletedLabel'));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
      navigateTo(message) {
        const id = message.nodeId;
        return ContentNodeResource.fetchModel({ id })
          .then(contentNode => {
            router.push(
              this.genContentLinkKeepCurrentBackLink(contentNode.id, contentNode.is_leaf),
            );
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
      onFinished() {
        if (this.errored) {
          return;
        }
        if (this.wasComplete) {
          this.$emit('finished');
        } else if (this.complete) {
          // Only show the completion modal if this is marked as complete
          this.displayCompletionModal();
        } else {
          // Otherwise, set a watch for complete changing value
          // in case this gets updated soon after the finish event.
          // For example the media player plugin seems to emit the finished
          // event before the progress has been updated.
          const watchComplete = this.$watch('complete', () => {
            this.displayCompletionModal();
            watchComplete();
          });
          // We give a 250 millisecond timeout to let this change happen.
          // So if the completion does not update within 250 milliseconds,
          // we clear the watcher and will require another finished event
          // before we display the completion modal.
          setTimeout(watchComplete, 250);
        }
      },
      displayCompletionModal() {
        this.showCompletionModal = true;
      },
      hideCompletionModal() {
        this.showCompletionModal = false;
        this.wasComplete = true;
      },
      onError(error) {
        this.errored = true;
        this.$emit('error', error);
      },
      initSession(repeat = false) {
        /* Always be sure that this is hidden before the component renders */
        this.hideMarkAsCompleteModal();
        this.sessionReady = false;
        return this.initContentSession({
          node: this.content,
          lessonId: this.lessonId,
          repeat,
        }).then(() => {
          this.sessionReady = true;
          this.wasComplete = this.progress >= 1;
          // Set progress into the content node progress store in case it was not already loaded
          this.cacheProgress();
        });
      },
      repeat() {
        this.stopTracking().then(() => {
          this.initSession(true);
        });
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.completionModal.focusFirstEl();
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content-renderer {
    // 61 pixels is the height of the Learning Activity Bar + 5px.
    // This seems to be the largest height that the content renderer can be
    // without causing the page to scroll.
    height: calc(100vh - 61px);
  }

</style>
