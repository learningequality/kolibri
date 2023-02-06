<template>

  <div>

    <template v-if="sessionReady">
      <KContentRenderer
        v-if="!content.assessment"
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

      <AssessmentWrapper
        v-else
        class="content-renderer"
        :kind="content.kind"
        :files="content.files"
        :lang="content.lang"
        :randomize="content.randomize"
        :masteryModel="content.masteryModel"
        :assessmentIds="content.assessmentIds"
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
        @finished="onFinished"
      />
    </template>
    <KCircularLoader v-else />

    <CompletionModal
      v-if="showCompletionModal"
      ref="completionModal"
      :isUserLoggedIn="isUserLoggedIn"
      :contentNodeId="content.id"
      :lessonId="lessonId"
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

  import { mapState, mapGetters } from 'vuex';
  import { ContentNodeResource } from 'kolibri.resources';
  import router from 'kolibri.coreVue.router';
  import { setContentNodeProgress } from '../composables/useContentNodeProgress';
  import useProgressTracking from '../composables/useProgressTracking';
  import AssessmentWrapper from './AssessmentWrapper';
  import commonLearnStrings from './commonLearnStrings';
  import CompletionModal from './CompletionModal';
  import MarkAsCompleteModal from './MarkAsCompleteModal';

  export default {
    name: 'ContentPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', {
          contentTitle: this.content.title,
          channelTitle: this.content.ancestors[0].title,
        }),
      };
    },
    components: {
      AssessmentWrapper,
      CompletionModal,
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
      return {
        progress,
        time_spent,
        extra_fields,
        pastattempts,
        complete,
        totalattempts,
        initContentSession,
        updateContentSession,
        startTracking: startTrackingProgress,
        stopTracking: stopTrackingProgress,
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
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'currentUserId']),
      ...mapState({
        fullName: state => state.core.session.full_name,
      }),
      ...mapState(['showCompleteContentModal']),
    },
    watch: {
      progress() {
        // Ensure that our cached progress and tracked progress always stay up to date
        this.cacheProgress();
      },
    },
    created() {
      /* Always be sure that this is hidden before the component renders */
      this.hideMarkAsCompleteModal();
      return this.initContentSession({
        nodeId: this.content.id,
        lessonId: this.lessonId,
      }).then(() => {
        this.sessionReady = true;
        this.wasComplete = this.progress >= 1;
        // Set progress into the content node progress store in case it was not already loaded
        this.cacheProgress();
      });
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
            this.$store.dispatch('createSnackbar', this.learnString('resourceCompletedLabel'));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      navigateTo(message) {
        let id = message.nodeId;
        return ContentNodeResource.fetchModel({ id })
          .then(contentNode => {
            router.push(this.genContentLink(contentNode.id, null, contentNode.is_leaf, null, {}));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      onFinished() {
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
        this.$store.dispatch('handleApiError', error);
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.completionModal.focusFirstEl();
        });
      },
    },
    $trs: {
      documentTitle: {
        message: '{ contentTitle } - { channelTitle }',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content {
    z-index: 0;
    max-height: 100vh;
  }

</style>
