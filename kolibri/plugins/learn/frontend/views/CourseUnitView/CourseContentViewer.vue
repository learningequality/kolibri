<template>

  <div class="course-content-view">
    <KCircularLoader
      v-if="!sessionReady"
      disableDefaultTransition
    />
    <ContentViewer
      v-else
      class="content-viewer"
      :lang="contentNode.lang"
      :files="contentNode.files"
      :options="contentNode.options"
      :duration="contentNode.duration"
      :extraFields="extra_fields"
      :progress="progress"
      :userId="currentUserId"
      :userFullName="fullName"
      :timeSpent="time_spent"
      @startTracking="startTrackingProgress"
      @stopTracking="stopTrackingProgress"
      @updateProgress="handleUpdateProgress"
      @addProgress="handleAddProgress"
      @updateContentState="handleUpdateContentState"
      @error="onError"
    />
  </div>

</template>


<script>

  import store from 'kolibri/store';
  import { ref, watch } from 'vue';
  import useUser from 'kolibri/composables/useUser';
  import { setContentNodeProgress } from '../../composables/useContentNodeProgress';
  import useProgressTracking from '../../composables/useProgressTracking';

  /**
   * CourseContentView renders non-assessment content (videos, PDFs, articles, HTML5)
   * within the course experience. It integrates ContentViewer with progress tracking
   * and handles silent completion (no CompletionModal).
   *
   * Key differences from ContentPage.vue:
   * - No CompletionModal on completion - completion is silent
   * - No auto-navigation - user advances via side panel or bottom bar
   * - Progress is saved with course session context (via courseSessionId prop)
   * - Errors are handled internally via store dispatch
   */
  export default {
    name: 'CourseContentView',
    setup(props) {
      const {
        progress,
        time_spent,
        extra_fields,
        initContentSession,
        updateContentSession,
        startTrackingProgress,
        stopTrackingProgress,
      } = useProgressTracking();

      const { currentUserId, full_name: fullName } = useUser();

      const sessionReady = ref(false);
      const errored = ref(false);

      /**
       * Update the progress of the content node in the shared progress store
       * in the useContentNodeProgress composable. Do this to have a single
       * source of truth for referencing progress of content nodes.
       */
      const cacheProgress = () => {
        setContentNodeProgress({
          content_id: props.contentNode.content_id,
          progress: progress.value,
        });
      };

      /**
       * Wrapped updateContentSession to prevent updates after error
       */
      const wrappedUpdateContentSession = data => {
        if (!errored.value) {
          return updateContentSession(data);
        }
        return Promise.resolve();
      };

      const handleUpdateProgress = progressValue => {
        return wrappedUpdateContentSession({ progress: progressValue });
      };

      const handleAddProgress = progressDelta => {
        return wrappedUpdateContentSession({ progressDelta });
      };

      const handleUpdateContentState = contentState => {
        return wrappedUpdateContentSession({ contentState });
      };

      const onError = error => {
        errored.value = true;
        store.dispatch('handleApiError', { error });
      };

      /**
       * Initialize the content session for progress tracking
       */
      const initSession = async () => {
        sessionReady.value = false;
        errored.value = false;

        try {
          await initContentSession({
            node: props.contentNode,
            courseSessionId: props.courseSessionId,
          });
          sessionReady.value = true;
          // Set progress into the content node progress store
          cacheProgress();
        } catch (error) {
          store.dispatch('handleApiError', { error });
        }
      };

      // Watch for progress changes to keep cache up to date
      watch(progress, () => {
        cacheProgress();
      });

      // Watch for content node changes to reinitialize session
      watch(
        () => props.contentNode.id,
        (newId, oldId) => {
          if (newId && newId !== oldId) {
            initSession();
          }
        },
      );

      initSession();

      return {
        // State
        sessionReady,
        progress,
        time_spent,
        extra_fields,
        currentUserId,
        fullName,

        // Methods
        startTrackingProgress,
        stopTrackingProgress,
        handleUpdateProgress,
        handleAddProgress,
        handleUpdateContentState,
        onError,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      courseSessionId: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .course-content-view {
    width: 100%;
    height: 100%;
  }

  .content-viewer {
    width: 100%;
    height: 100%;
  }

</style>
