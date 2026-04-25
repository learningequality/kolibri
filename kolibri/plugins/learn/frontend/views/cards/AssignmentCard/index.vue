<template>

  <KCard
    v-if="assignment"
    :to="to"
    :title="title"
    :headingLevel="3"
    :orientation="showThumbnail ? 'vertical' : windowBreakpoint === 0 ? 'vertical' : 'horizontal'"
    :thumbnailDisplay="showThumbnail ? 'large' : 'none'"
    thumbnailAlign="left"
  >
    <template
      v-if="showThumbnail && quiz"
      #thumbnailPlaceholder
    >
      <KIcon
        icon="exercise"
        :color="$themeTokens.primary"
        class="thumbnail-icon"
      />
    </template>
    <template #aboveTitle>
      <div
        v-if="showThumbnail && quiz"
        class="above-title"
      >
        <div
          v-if="collectionTitle"
          class="collection-title"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ collectionTitle }}
        </div>
        <span class="quiz-label">
          <span
            class="label"
            data-testid="label"
          >
            {{ quizLabel$() }}
          </span>
          <KIcon
            icon="quiz"
            class="icon"
            :color="$themeTokens.primary"
          />
        </span>
      </div>
      <div
        v-else-if="collectionTitle"
        class="collection-title"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ collectionTitle }}
      </div>
    </template>
    <template #footer>
      <!-- Course: label badge and lesson count -->
      <div
        v-if="course"
        class="footer-content"
      >
        <div
          class="course-label"
          :style="{ backgroundColor: $themePalette.blue.v_100 }"
        >
          <KIcon
            icon="course"
            class="label-icon"
            :color="$themeTokens.primary"
          />
          <span
            class="label-text"
            :style="{ color: $themeTokens.primary }"
          >{{ courseLabel }}</span>
        </div>
        <span
          v-if="courseCountsLabel"
          class="course-counts"
        >{{ courseCountsLabel }}</span>
      </div>
      <!-- Lesson or Quiz: progress indicators -->
      <div
        v-else
        class="progress-section"
      >
        <KLabeledIcon
          v-if="inProgressLabel"
          :color="$themeTokens.progress"
          :label="inProgressLabel"
          icon="inProgress"
        />
        <KLabeledIcon
          v-else-if="completedLabel && !reportVisible"
          :color="$themePalette.grey.v_300"
          :label="completedLabel"
          icon="permissions"
        />
        <KLabeledIcon
          v-else-if="completedLabel && reportVisible"
          :color="$themeTokens.mastered"
          :label="completedLabel"
          icon="mastered"
        />
      </div>
    </template>
  </KCard>

</template>


<script>

  import { computed } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import useContentNodeProgress from '../../../composables/useContentNodeProgress';
  import { learnStrings } from '../../commonLearnStrings';

  export default {
    name: 'AssignmentCard',
    setup(props) {
      const { windowBreakpoint } = useKResponsiveWindow();
      const { quizLabel$, inProgressLabel$, completedLabel$ } = coreStrings;
      const { courseLabel$, numUnits$, numLessons$ } = coursesStrings;
      const { questionsLeft$, completedPercentLabel$ } = learnStrings;
      const { contentNodeProgressMap } = useContentNodeProgress();

      // All computed properties
      const assignment = computed(() => props.course || props.lesson || props.quiz);

      const title = computed(() => (assignment.value ? assignment.value.title : ''));

      // Course-specific
      const courseLabel = computed(() => courseLabel$());

      const courseCountsLabel = computed(() => {
        if (!props.course) return '';
        const parts = [];
        const unitNum = props.course.unit_count;
        if (typeof unitNum === 'number' && unitNum > 0) {
          parts.push(numUnits$({ num: unitNum }));
        }
        const lessonNum = props.course.lesson_count;
        if (typeof lessonNum === 'number' && lessonNum > 0) {
          parts.push(numLessons$({ num: lessonNum }));
        }
        return parts.join(' · ');
      });

      // Lesson-specific: use contentNodeProgressMap for real-time progress,
      // falling back to API-provided progress for each resource
      const lessonProgress = computed(() => {
        if (!props.lesson) return NaN;
        const resources = props.lesson.resources || [];
        const total_resources = resources.length;
        if (total_resources === 0) return NaN;
        const resource_progress = resources.reduce((sum, resource) => {
          const contentId = resource.contentnode && resource.contentnode.content_id;
          const progress = contentId
            ? Math.max(contentNodeProgressMap[contentId] || 0, resource.progress || 0)
            : resource.progress || 0;
          return sum + progress;
        }, 0);
        if (resource_progress * total_resources === 0) return NaN;
        return resource_progress - total_resources;
      });

      // Quiz-specific
      const quizProgress = computed(() => (props.quiz ? props.quiz.progress : undefined));

      const reportVisible = computed(() => {
        if (!props.quiz) return true;
        const { instant_report_visibility, archive } = props.quiz;
        return instant_report_visibility !== false || archive;
      });

      // Shared progress labels
      const inProgressLabel = computed(() => {
        if (props.lesson) {
          return lessonProgress.value < 0 ? inProgressLabel$() : '';
        }
        if (props.quiz && quizProgress.value) {
          const { started, closed, answer_count } = quizProgress.value;
          const { question_count } = props.quiz;
          if (started && !closed) {
            return questionsLeft$({
              questionsLeft: Math.max(0, question_count - answer_count),
            });
          }
        }
        return '';
      });

      const completedLabel = computed(() => {
        if (props.lesson) {
          return lessonProgress.value >= 0 ? completedLabel$() : '';
        }
        if (props.quiz && quizProgress.value) {
          const { score, closed } = quizProgress.value;
          const { question_count } = props.quiz;
          if (closed) {
            let percentage = 0;
            const nCorrect = Number(score);
            if (nCorrect > 0) {
              percentage = Math.round(100 * (nCorrect / question_count));
            }
            return completedPercentLabel$({ score: percentage });
          }
        }
        return '';
      });

      return {
        windowBreakpoint,
        quizLabel$,
        assignment,
        title,
        courseLabel,
        courseCountsLabel,
        reportVisible,
        inProgressLabel,
        completedLabel,
      };
    },
    props: {
      /**
       * Vue-router link object.
       */
      to: {
        type: Object,
        required: true,
      },
      collectionTitle: {
        type: String,
        required: false,
        default: '',
      },
      course: {
        type: Object,
        required: false,
        default: null,
      },
      lesson: {
        type: Object,
        required: false,
        default: null,
      },
      quiz: {
        type: Object,
        required: false,
        default: null,
      },
      showThumbnail: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .above-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .collection-title {
    font-size: 12px;
  }

  .quiz-label {
    display: inline-flex;
    align-items: center;
  }

  .label {
    padding-right: 4px;
    padding-left: 4px;
  }

  .icon {
    font-size: 18px;

    &:not(:first-child) {
      margin-left: 2px;
    }
  }

  .progress-section {
    display: flex;
    align-items: center;
    height: 18px;
  }

  .footer-content {
    display: flex;
    align-items: center;
  }

  .course-label {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px 4px 8px;
    border-radius: 16px;
  }

  .course-counts {
    margin-left: 8px;
    font-size: 12px;
  }

  .label-icon {
    width: 12px;
    height: 12px;
    font-size: 12px;
  }

  .label-text {
    margin-left: 4px;
    font-size: 12px;
  }

  .thumbnail-icon {
    font-size: 48px;
  }

</style>
