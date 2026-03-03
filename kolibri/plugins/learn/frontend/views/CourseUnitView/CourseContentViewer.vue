<template>

  <div class="course-content-view">
    <KCircularLoader
      v-if="!sessionReady"
      disableDefaultTransition
    />
    <template v-else>
      <ContentViewer
        v-if="!contentNode.assessmentmetadata"
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
      <div v-else-if="isPracticeQuiz || isSurvey"></div>
      <AssessmentWrapper
        v-else
        class="content-viewer"
        :files="contentNode.files"
        :lang="contentNode.lang"
        :randomize="contentNode.assessmentmetadata.randomize"
        :masteryModel="contentNode.assessmentmetadata.mastery_model"
        :assessmentIds="contentNode.assessmentmetadata.assessment_item_ids"
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        :pastattempts="pastattempts"
        :mastered="complete"
        :totalattempts="totalattempts"
        :hasNextResource="hasNext"
        @startTracking="startTrackingProgress"
        @stopTracking="stopTrackingProgress"
        @updateInteraction="handleUpdateInteraction"
        @updateProgress="handleUpdateProgress"
        @updateContentState="handleUpdateContentState"
        @nextResource="$emit('next')"
        @error="onError"
        @finished="$emit('finished')"
      />
    </template>
  </div>

</template>


<script>

  import useUser from 'kolibri/composables/useUser';
  import Modalities from 'kolibri-constants/Modalities';
  import { computed } from 'vue';
  import AssessmentWrapper from '../courses/AssessmentWrapper/index.vue';
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
    emits: ['finished', 'next'],
    components: {
      AssessmentWrapper,
    },
    setup(props) {
      const {
        sessionReady,
        progress,
        time_spent,
        extra_fields,
        pastattempts,
        complete,
        totalattempts,
        handleUpdateInteraction,
        startTrackingProgress,
        stopTrackingProgress,
        handleUpdateProgress,
        handleAddProgress,
        handleUpdateContentState,
        onError,
      } = injectCourseContentProgress();

      const { currentUserId, full_name: fullName } = useUser();

      const isPracticeQuiz = computed(() => {
        return props.contentNode.modality === Modalities.QUIZ;
      });

      const isSurvey = computed(() => {
        return props.contentNode.modality === Modalities.SURVEY;
      });

      return {
        // State
        sessionReady,
        progress,
        time_spent,
        extra_fields,
        currentUserId,
        fullName,
        pastattempts,
        complete,
        totalattempts,

        // computed
        isPracticeQuiz,
        isSurvey,

        // Methods
        startTrackingProgress,
        stopTrackingProgress,
        handleUpdateProgress,
        handleAddProgress,
        handleUpdateInteraction,
        handleUpdateContentState,
        onError,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      hasNext: {
        type: Boolean,
        default: false,
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
