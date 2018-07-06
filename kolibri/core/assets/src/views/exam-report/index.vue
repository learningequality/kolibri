<template>

  <multi-pane-layout ref="multiPaneLayout">
    <page-status
      slot="header"
      :contentName="exam.title"
      :userName="userName"
      :questions="examAttempts"
      :completionTimestamp="completionTimestamp"
      :completed="closed"
    />

    <attempt-log-list
      slot="aside"
      :attemptLogs="attemptLogs"
      :selectedQuestionNumber="questionNumber"
      @select="handleNavigateToQuestion"
    />

    <div slot="main" class="exercise-container">
      <h3>{{ $tr('question', {questionNumber: questionNumber + 1}) }}</h3>

      <k-checkbox
        :label="$tr('showCorrectAnswerLabel')"
        :checked="showCorrectAnswer"
        @change="toggleShowCorrectAnswer"
      />
      <interaction-list
        v-if="!showCorrectAnswer"
        :interactions="currentInteractionHistory"
        :selectedInteractionIndex="selectedInteractionIndex"
        @select="navigateToQuestionAttempt"
      />
      <content-renderer
        :id="exercise.pk"
        :itemId="itemId"
        :allowHints="false"
        :kind="exercise.kind"
        :files="exercise.files"
        :contentId="exercise.content_id"
        :available="exercise.available"
        :extraFields="exercise.extra_fields"
        :interactive="false"
        :assessment="true"
        :answerState="answerState"
        :showCorrectAnswer="showCorrectAnswer"
      />
    </div>
  </multi-pane-layout>

</template>


<script>

  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import attemptLogList from 'kolibri.coreVue.components.attemptLogList';
  import interactionList from 'kolibri.coreVue.components.interactionList';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import find from 'lodash/find';
  import multiPaneLayout from 'kolibri.coreVue.components.multiPaneLayout';
  import pageStatus from './page-status';

  export default {
    name: 'examReport',
    $trs: {
      backTo: 'Back to exam report for { title }',
      correctAnswer: 'Correct answer',
      yourAnswer: 'Your answer',
      correctAnswerCannotBeDisplayed: 'Correct answer cannot be displayed',
      question: 'Question { questionNumber, number }',
      showCorrectAnswerLabel: 'Show correct answer',
    },
    components: {
      immersiveFullScreen,
      contentRenderer,
      pageStatus,
      attemptLogList,
      interactionList,
      kButton,
      kCheckbox,
      multiPaneLayout,
    },
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
    },
    data() {
      return {
        showCorrectAnswer: false,
      };
    },
    computed: {
      attemptLogs() {
        return this.examAttempts.map(attempt => {
          const questionId = this.questions[attempt.questionNumber - 1].contentId;
          const num_coach_contents = find(this.exerciseContentNodes, { id: questionId })
            .num_coach_contents;
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
    vuex: {
      getters: {
        questions: state => state.pageState.questions,
        exerciseContentNodes: state => state.pageState.exerciseContentNodes,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exercise-container
    background-color: $core-bg-light
    padding: 8px

  h3
    margin-top: 0

</style>
