<template>

  <MultiPaneLayout ref="multiPaneLayout">
    <PageStatus
      slot="header"
      :contentName="exam.title"
      :userName="userName"
      :questions="examAttempts"
      :completionTimestamp="completionTimestamp"
      :completed="closed"
    />

    <AttemptLogList
      slot="aside"
      :attemptLogs="attemptLogs"
      :selectedQuestionNumber="questionNumber"
      @select="handleNavigateToQuestion"
    />

    <div
      v-if="exercise"
      slot="main"
      class="exercise-container"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <h3>{{ coreString('questionNumberLabel', {questionNumber: questionNumber + 1}) }}</h3>

      <KCheckbox
        :label="coreString('showCorrectAnswerLabel')"
        :checked="showCorrectAnswer"
        @change="toggleShowCorrectAnswer"
      />
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

    <p v-else slot="main">
      {{ $tr('noItemId') }}
    </p>
  </MultiPaneLayout>

</template>


<script>

  import AttemptLogList from 'kolibri.coreVue.components.AttemptLogList';
  import InteractionList from 'kolibri.coreVue.components.InteractionList';
  import find from 'lodash/find';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PageStatus from './PageStatus';

  export default {
    name: 'ExamReport',
    components: {
      PageStatus,
      AttemptLogList,
      InteractionList,
      MultiPaneLayout,
    },
    mixins: [commonCoreStrings],
    props: {
      examAttempts: {
        type: Array,
        required: true,
      },
      exam: {
        type: Object,
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
      closed: {
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
        required: true,
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
      noItemId: 'This question has an error, please move on to the next question',
    },
  };

</script>


<style lang="scss" scoped>

  .exercise-container {
    padding: 8px;
  }

  h3 {
    margin-top: 0;
  }

</style>
