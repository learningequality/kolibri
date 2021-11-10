<template>

  <ExamReport
    :examAttempts="quizAttempts"
    :exam="{ title: 'test' }"
    :userName="userName"
    :userId="userId"
    :currentInteractionHistory="currentInteractionHistory"
    :currentInteraction="currentInteraction"
    :selectedInteractionIndex="selectedInteractionIndex"
    :questionNumber="questionNumber"
    :exercise="{ available: available, kind: kind, files: files, extra_fields: extraFields }"
    :itemId="itemId"
    :completionTimestamp="completionTimestamp"
    :complete="true"
    :navigateToQuestion="navigateToQuestion"
    :navigateToQuestionAttempt="navigateToQuestionAttempt"
    :questions="questions"
    :retry="true"
    @repeat="$emit('repeat')"
  />

</template>


<script>

  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import { AttemptLogResource } from 'kolibri.resources';

  export default {
    name: 'QuizReport',
    components: {
      ExamReport,
    },
    props: {
      contentId: {
        type: String,
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
      questions: {
        type: Array,
        default: () => [],
      },
      kind: {
        type: String,
        required: true,
      },
      files: {
        type: Array,
        default: () => [],
      },
      available: {
        type: Boolean,
        default: false,
      },
      extraFields: {
        type: Object,
        default: () => ({}),
      },
      masteryLevel: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        questionNumber: 0,
        selectedInteractionIndex: 0,
        pastattempts: [],
      };
    },
    computed: {
      completionTimestamp() {
        return this.pastattempts.length
          ? this.pastattempts
              .map(a => a.end_timestamp)
              .sort()
              .slice(-1)[0]
          : null;
      },
      quizAttempts() {
        return this.questions.map((itemId, index) => {
          const attempt = this.pastattempts.find(a => a.item === itemId);
          const questionNumber = index + 1;
          const noattempt = !attempt;
          return {
            ...(attempt || {}),
            noattempt,
            questionNumber,
          };
        });
      },
      itemId() {
        return this.questions[this.questionNumber];
      },
      currentAttempt() {
        return this.quizAttempts.find(a => a.item === this.itemId);
      },
      currentInteractionHistory() {
        return this.currentAttempt ? this.currentAttempt.interaction_history || [] : [];
      },
      currentInteraction() {
        return (
          this.currentInteractionHistory &&
          this.currentInteractionHistory[this.selectedInteractionIndex]
        );
      },
    },
    created() {
      this.loadAttempts();
    },
    methods: {
      navigateToQuestion(questionNumber) {
        this.navigateTo(questionNumber, 0);
      },
      navigateToQuestionAttempt(interaction) {
        this.navigateTo(this.questionNumber, interaction);
      },
      navigateTo(question, interaction) {
        this.questionNumber = question;
        this.selectedInteractionIndex = interaction;
      },
      loadAttempts() {
        // TODO: rtibbles use new API endpoint for fetching annotated attempt data.
        AttemptLogResource.fetchCollection({
          getParams: { content_id: this.contentId, mastery_level: this.masteryLevel },
        }).then(attempts => {
          this.pastattempts = attempts;
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .no-exercise {
    text-align: center;
  }

</style>
