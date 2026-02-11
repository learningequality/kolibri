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
      @finished="$emit('finished')"
    />
  </div>

</template>


<script>

  import useUser from 'kolibri/composables/useUser';
  import { injectCourseContentProgress } from './useCourseContentProgressTracking';

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
   *
   * Progress tracking state and handlers are provided by the parent
   * CourseUnitView via the useCourseContentProgressTracking composable.
   */
  export default {
    name: 'CourseContentViewer',
    emits: ['finished'],
    setup() {
      const {
        sessionReady,
        progress,
        time_spent,
        extra_fields,
        startTrackingProgress,
        stopTrackingProgress,
        handleUpdateProgress,
        handleAddProgress,
        handleUpdateContentState,
        onError,
      } = injectCourseContentProgress();

      const { currentUserId, full_name: fullName } = useUser();

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
