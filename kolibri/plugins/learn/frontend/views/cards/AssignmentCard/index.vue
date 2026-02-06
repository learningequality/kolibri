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
            data-test="label"
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
      <!-- Course: pill badge and lesson count -->
      <div
        v-if="course"
        class="footer-content"
      >
        <div
          class="course-pill"
          :style="pillStyle"
        >
          <KIcon
            icon="course"
            class="pill-icon"
            :color="$themeTokens.primary"
          />
          <span
            class="pill-label"
            :style="pillLabelStyle"
          >{{ courseLabel }}</span>
        </div>
        <span
          v-if="lessonCountLabel"
          class="lesson-count"
        >{{ lessonCountLabel }}</span>
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

  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';

  export default {
    name: 'AssignmentCard',
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      const { quizLabel$ } = coreStrings;
      return {
        windowBreakpoint,
        quizLabel$,
      };
    },
    props: {
      /**
       * vue-router link object
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
    computed: {
      assignment() {
        return this.course || this.lesson || this.quiz;
      },
      title() {
        return this.assignment ? this.assignment.title : '';
      },
      // Course-specific
      courseLabel() {
        // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
        return coursesStrings.$tr('courseLabel');
      },
      pillStyle() {
        return {
          backgroundColor: this.$themePalette.blue.v_100,
        };
      },
      pillLabelStyle() {
        return {
          color: this.$themeTokens.primary,
        };
      },
      lessonCountLabel() {
        if (!this.course) {
          return '';
        }
        const count = this.course.lesson_count;
        if (typeof count !== 'number' || count === 0) {
          return '';
        }
        // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
        return coursesStrings.$tr('courseLessonCount', { count });
      },
      // Lesson-specific
      lessonProgress() {
        if (!this.lesson || !this.lesson.progress) {
          return NaN;
        }
        const { resource_progress, total_resources } = this.lesson.progress;
        if (resource_progress * total_resources === 0) {
          return NaN;
        } else {
          return resource_progress - total_resources;
        }
      },
      // Quiz-specific
      quizProgress() {
        return this.quiz ? this.quiz.progress : undefined;
      },
      reportVisible() {
        if (!this.quiz) {
          return true;
        }
        const { instant_report_visibility, archive } = this.quiz;
        return instant_report_visibility !== false || archive;
      },
      // Shared progress labels
      inProgressLabel() {
        if (this.lesson) {
          return this.lessonProgress < 0 ? this.coreString('inProgressLabel') : '';
        }
        if (this.quiz && this.quizProgress) {
          const { started, closed, answer_count } = this.quizProgress;
          const { question_count } = this.quiz;
          if (started && !closed) {
            return this.$tr('questionsLeft', {
              questionsLeft: Math.max(0, question_count - answer_count),
            });
          }
        }
        return '';
      },
      completedLabel() {
        if (this.lesson) {
          return this.lessonProgress >= 0 ? this.coreString('completedLabel') : '';
        }
        if (this.quiz && this.quizProgress) {
          const { score, closed } = this.quizProgress;
          const { question_count } = this.quiz;
          if (closed) {
            let percentage = 0;
            const nCorrect = Number(score);
            if (nCorrect > 0) {
              percentage = Math.round(100 * (nCorrect / question_count));
            }
            return this.$tr('completedPercentLabel', { score: percentage });
          }
        }
        return '';
      },
    },
    $trs: {
      questionsLeft: {
        message:
          '{questionsLeft, number, integer} {questionsLeft, plural, one {question} other {questions}} left',
        context: 'Indicates how many questions the learner has left to complete.',
      },
      completedPercentLabel: {
        message: 'Score: {score, number, integer}%',
        context: 'A label shown to learners on a quiz card when the quiz is completed',
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

    &.reversed {
      flex-direction: row-reverse;
    }
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

  .course-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px 4px 8px;
    border-radius: 16px;
  }

  .lesson-count {
    margin-left: 8px;
    font-size: 12px;
  }

  .pill-icon {
    width: 12px;
    height: 12px;
    font-size: 12px;
  }

  .pill-label {
    margin-left: 4px;
    font-size: 12px;
  }

  .thumbnail-icon {
    font-size: 48px;
  }

</style>
