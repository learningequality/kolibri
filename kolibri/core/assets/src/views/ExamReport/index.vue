<template>

  <component
    :is="practiceQuiz ? 'EmbeddedMultiPaneLayout' : 'MultiPaneLayout'"
    ref="multiPaneLayout"
    class="container"
  >
    <template #header>
      <slot name="header">
        <PageStatus
          :contentName="exam.title"
          :userName="userName"
          :questions="examAttempts"
          :completionTimestamp="completionTimestamp"
          :completed="complete"
          :timeSpent="timeSpent"
        />
      </slot>
    </template>

    <template v-if="!windowIsSmall" #aside>
      <AttemptLogList
        :attemptLogs="attemptLogs"
        :selectedQuestionNumber="questionNumber"
        @select="handleNavigateToQuestion"
      />
    </template>

    <template #main>
      <AttemptLogList
        v-if="windowIsSmall"
        :isMobile="windowIsSmall"
        :class="windowIsSmall ? 'mobile-attempt-log-list' : ''"
        :attemptLogs="attemptLogs"
        :selectedQuestionNumber="questionNumber"
        @select="handleNavigateToQuestion"
      />
      <div
        v-if="exercise"
        class="exercise-container"
        :class="windowIsSmall ? 'mobile-exercise-container' : ''"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <h3>{{ coreString('questionNumberLabel', { questionNumber: questionNumber + 1 }) }}</h3>

        <KCheckbox
          :label="coreString('showCorrectAnswerLabel')"
          :checked="showCorrectAnswer"
          @change="toggleShowCorrectAnswer"
        />
        <div v-if="currentAttemptDiff" style="padding-bottom: 15px;">
          <AttemptIconDiff
            :correct="currentAttempt.correct"
            :diff="currentAttemptDiff.correct"
          />
          <AttemptTextDiff
            :userId="userId"
            :correct="currentAttempt.correct"
            :diff="currentAttemptDiff.correct"
          />
        </div>
        <InteractionList
          v-if="!showCorrectAnswer"
          :interactions="currentInteractionHistory"
          :selectedInteractionIndex="selectedInteractionIndex"
          @select="navigateToQuestionAttempt"
        />
        <KContentRenderer
          v-if="exercise"
          :itemId="itemId"
          :allowHints="false"
          :kind="exercise.kind"
          :files="exercise.files"
          :available="exercise.available"
          :extraFields="exercise.extra_fields"
          :interactive="false"
          :assessment="true"
          :answerState="answerState"
          :showCorrectAnswer="showCorrectAnswer"
        />
      </div>

      <p v-else>
        {{ $tr('noItemId') }}
      </p>
    </template>
  </component>

</template>


<script>

  import AttemptLogList from 'kolibri.coreVue.components.AttemptLogList';
  import InteractionList from 'kolibri.coreVue.components.InteractionList';
  import find from 'lodash/find';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import EmbeddedMultiPaneLayout from 'kolibri.coreVue.components.EmbeddedMultiPaneLayout';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import AttemptTextDiff from './AttemptTextDiff';
  import AttemptIconDiff from './AttemptIconDiff';
  import PageStatus from './PageStatus';

  export default {
    name: 'ExamReport',
    components: {
      PageStatus,
      AttemptLogList,
      InteractionList,
      MultiPaneLayout,
      EmbeddedMultiPaneLayout,
      AttemptIconDiff,
      AttemptTextDiff,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      examAttempts: {
        type: Array,
        required: true,
      },
      exam: {
        type: Object,
        required: true,
      },
      userId: {
        type: String,
        required: true,
      },
      userName: {
        type: String,
        required: true,
      },
      currentInteractionHistory: {
        type: Array,
        required: true,
      },
      currentInteraction: {
        type: Object,
        required: false,
        default: null,
      },
      selectedInteractionIndex: {
        type: Number,
        required: true,
      },
      questionNumber: {
        type: Number,
        required: true,
      },
      exercise: {
        type: Object,
        required: true,
      },
      itemId: {
        type: String,
        required: true,
      },
      completionTimestamp: {
        type: Date,
        required: false,
        default: null,
      },
      complete: {
        type: Boolean,
        required: true,
      },
      navigateToQuestion: {
        type: Function,
        required: true,
      },
      navigateToQuestionAttempt: {
        type: Function,
        required: true,
      },
      questions: {
        type: Array,
        required: true,
      },
      exerciseContentNodes: {
        type: Array,
        default: () => [],
      },
      timeSpent: {
        type: Number,
        default: 0,
      },
      practiceQuiz: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        showCorrectAnswer: false,
      };
    },
    computed: {
      attemptLogs() {
        return this.examAttempts.map(attempt => {
          if (!this.exerciseContentNodes.length) {
            return attempt;
          }
          let num_coach_contents = 0;
          const exerciseId = this.questions[attempt.questionNumber - 1].exercise_id;
          const exerciseMatch = find(this.exerciseContentNodes, { id: exerciseId });
          if (exerciseMatch) {
            num_coach_contents = exerciseMatch.num_coach_contents;
          }
          return { ...attempt, num_coach_contents };
        });
      },
      answerState() {
        // Do not pass in answerState if showCorrectAnswer is set to true
        // answerState has a precedence over showCorrectAnswer
        if (
          !this.showCorrectAnswer &&
          this.currentInteraction &&
          this.currentInteraction.type === 'answer'
        ) {
          return this.currentInteraction.answer;
        }
        return null;
      },
      currentAttempt() {
        return this.attemptLogs.find(a => a.item === this.itemId);
      },
      currentAttemptDiff() {
        return this.currentAttempt &&
          this.currentAttempt.diff &&
          this.currentAttempt.diff.correct !== null
          ? this.currentAttempt.diff
          : null;
      },
    },
    methods: {
      handleNavigateToQuestion(questionNumber) {
        this.navigateToQuestion(questionNumber);
        this.$refs.multiPaneLayout.scrollMainToTop();
        this.showCorrectAnswer = false;
      },
      toggleShowCorrectAnswer() {
        this.showCorrectAnswer = !this.showCorrectAnswer;
        this.$forceUpdate();
      },
    },
    $trs: {
      noItemId: {
        message: 'This question has an error, please move on to the next question',
        context:
          'Message that a coach would see in a report that indicates that there is an error in one of the questions in a quiz.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .exercise-container {
    padding: 8px;
  }

  .container {
    top: 24px;
    max-width: 1000px;
    margin: 0 auto;
    background-color: white;
  }

  .mobile-exercise-container {
    margin-top: 16px;
  }

  .mobile-attempt-log-list {
    margin-top: 16px;
  }

  h3 {
    margin-top: 0;
  }

</style>
