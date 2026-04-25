<template>

  <div class="course-content-view">
    <KCircularLoader
      v-if="!sessionReady"
      disableDefaultTransition
    />
    <template v-else>
      <PrePostTestRenderer
        v-if="isPrePostTest"
        class="content-viewer"
        :content="contentNode"
        :extraFields="extra_fields"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        :pastattempts="pastattempts"
        :mastered="complete"
        :masteryLevel="masteryLevel"
        :masteryCriterion="mastery_criterion"
        :updateContentSession="updateContentSession"
        @startTracking="startTrackingProgress"
        @stopTracking="stopTrackingProgress"
        @updateInteraction="handleUpdateInteraction"
        @updateProgress="handleUpdateProgress"
        @updateContentState="handleUpdateContentState"
        @repeat="restartContentSession"
        @error="onError"
        @finished="onFinished"
      />
      <ContentViewer
        v-else-if="!contentNode.assessmentmetadata"
        data-testid="content-viewer"
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
        @finished="onFinished"
      />
      <QuizRenderer
        v-else-if="isPracticeQuiz || isSurvey"
        class="content-viewer"
        :content="contentNode"
        :extraFields="extra_fields"
        :progress="progress"
        :userId="currentUserId"
        :userFullName="fullName"
        :timeSpent="time_spent"
        :pastattempts="pastattempts"
        :mastered="complete"
        :masteryLevel="masteryLevel"
        :updateContentSession="updateContentSession"
        :isSurvey="isSurvey"
        @startTracking="startTrackingProgress"
        @stopTracking="stopTrackingProgress"
        @updateInteraction="handleUpdateInteraction"
        @updateProgress="handleUpdateProgress"
        @updateContentState="handleUpdateContentState"
        @repeat="restartContentSession"
        @error="onError"
        @finished="onFinished"
      >
        <template
          v-if="nextResource || previousResource"
          #sidePanelFooter
        >
          <UpNextNavigationFooter
            nextEnabled
            :label="nextResource ? nextResourceLabel$() : previousResourceLabel$()"
            :nextNode="nextResource || previousResource"
            @next="nextResource ? $emit('next') : $emit('prev')"
          />
        </template>
      </QuizRenderer>
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
        :hasNextResource="Boolean(nextResource)"
        @startTracking="startTrackingProgress"
        @stopTracking="stopTrackingProgress"
        @updateInteraction="handleUpdateInteraction"
        @updateProgress="handleUpdateProgress"
        @updateContentState="handleUpdateContentState"
        @nextResource="$emit('next')"
        @error="onError"
        @finished="onFinished"
      />
    </template>
  </div>

</template>


<script>

  import useUser from 'kolibri/composables/useUser';
  import Modalities from 'kolibri-constants/Modalities';
  import { computed } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import AssessmentWrapper from '../courses/AssessmentWrapper/index.vue';
  import QuizRenderer from '../courses/QuizRenderer/index.vue';
  import PrePostTestRenderer from '../courses/PrePostTestRenderer/index.vue';
  import { PRE_POST_TEST_CRITERION } from '../../constants';
  import { injectCourseContentProgress } from './useCourseContentProgressTracking';
  import UpNextNavigationFooter from './UpNextNavigationFooter.vue';

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
      QuizRenderer,
      AssessmentWrapper,
      PrePostTestRenderer,
      UpNextNavigationFooter,
    },
    setup(props, { emit }) {
      const {
        sessionReady,
        progress,
        time_spent,
        extra_fields,
        pastattempts,
        complete,
        context,
        totalattempts,
        mastery_criterion,
        handleUpdateInteraction,
        startTrackingProgress,
        stopTrackingProgress,
        restartContentSession,
        handleUpdateProgress,
        handleAddProgress,
        handleUpdateContentState,
        updateContentSession,
        onError,
      } = injectCourseContentProgress();

      const { currentUserId, full_name: fullName } = useUser();

      const isPracticeQuiz = computed(() => {
        return props.contentNode.modality === Modalities.QUIZ;
      });

      const isSurvey = computed(() => {
        return props.contentNode.modality === Modalities.SURVEY;
      });

      const isPrePostTest = computed(() => {
        return mastery_criterion.value?.type === PRE_POST_TEST_CRITERION;
      });

      const masteryLevel = computed(() => {
        return context.value?.mastery_level;
      });

      const onFinished = () => {
        emit('finished');
      };

      const { nextResourceLabel$, previousResourceLabel$ } = coursesStrings;

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
        mastery_criterion,

        // computed
        isSurvey,
        isPrePostTest,
        masteryLevel,
        isPracticeQuiz,

        // Methods
        startTrackingProgress,
        stopTrackingProgress,
        restartContentSession,
        handleUpdateProgress,
        handleAddProgress,
        handleUpdateInteraction,
        handleUpdateContentState,
        updateContentSession,
        onError,
        onFinished,

        // strings
        nextResourceLabel$,
        previousResourceLabel$,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      /**
       * Next available resource in the course unit. If provided, it means
       * that the resource is available to be navigated, which may enable a "next" button
       * on the content viewers.
       */
      nextResource: {
        type: Object,
        default: null,
      },
      /**
       * Previous resource in the course unit. Used mainly as navigation fallback in case there
       * isn't any other way to get out of the current viewer (e.g., no next resource available, but
       * no other way to get out of the current resource except going back to the previous one).
       */
      previousResource: {
        type: Object,
        default: null,
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
