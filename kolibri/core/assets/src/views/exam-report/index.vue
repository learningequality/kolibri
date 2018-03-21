<template>

  <div>
    <div class="summary-container">
      <page-status
        :contentName="exam.title"
        :userName="userName"
        :questions="examAttempts"
        :completionTimestamp="completionTimestamp"
        :completed="closed"
      />
    </div>
    <div class="details-container">
      <div class="attempt-log-container">
        <attempt-log-list
          :attemptLogs="examAttempts"
          :selectedQuestionNumber="questionNumber"
          @select="handleNavigateToQuestion"
        />
      </div>
      <div class="exercise-container" ref ="exerciseContainer">
        <h3>{{ $tr('question', {questionNumber: questionNumber + 1}) }}</h3>

        <k-checkbox
          label="Show correct answer"
          :checked="showCorrectAnswer"
          @change="toggleShowCorrectAnswer"
        />
        <interaction-list
          v-if="!showCorrectAnswer"
          :interactions="currentInteractionHistory"
          :attemptNumber="currentAttempt.questionNumber"
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
          :answerState="currentInteraction && !showCorrectAnswer ? currentInteraction.answer : null"
          :showCorrectAnswer="showCorrectAnswer"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import pageStatus from './page-status';
  import attemptLogList from 'kolibri.coreVue.components.attemptLogList';
  import interactionList from 'kolibri.coreVue.components.interactionList';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';

  export default {
    name: 'examReport',
    $trs: {
      backTo: 'Back to exam report for { title }',
      correctAnswer: 'Correct answer',
      yourAnswer: 'Your answer',
      correctAnswerCannotBeDisplayed: 'Correct answer cannot be displayed',
      question: 'Question { questionNumber, number }',
    },
    components: {
      immersiveFullScreen,
      contentRenderer,
      pageStatus,
      attemptLogList,
      interactionList,
      kButton,
      kCheckbox,
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
      userId: {
        type: String,
        required: true,
      },
      currentAttempt: {
        type: Object,
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
      backPageLink: {
        type: Object,
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
    methods: {
      handleNavigateToQuestion(questionNumber) {
        this.navigateToQuestion(questionNumber);
        this.$refs.exerciseContainer.scrollTop = 0;
        this.showCorrectAnswer = false;
      },
      toggleShowCorrectAnswer() {
        this.showCorrectAnswer = !this.showCorrectAnswer;
        this.$forceUpdate();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $container-side-padding = 16px
  $max-height = calc(100vh - 290px)

  .summary-container
    height: 15%

  .details-container
    width: 100%
    height: 85%
    padding-top: $container-side-padding
    clearfix()

  .attempt-log-container
    width: 30%
    height: 100%
    max-height: $max-height
    overflow-y: auto
    float: left

  .exercise-container
    width: 70%
    height: 100%
    max-height: $max-height
    padding-left: $container-side-padding
    padding-right: $container-side-padding
    float: left
    overflow: auto

</style>
