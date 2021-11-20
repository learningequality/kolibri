<template>

  <ExamReport
    :examAttempts="quizAttempts"
    class="report"
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
    :timeSpent="timeSpent"
    @repeat="$emit('repeat')"
  />

</template>


<script>

  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import { MasteryLogResource } from 'kolibri.resources';

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
    },
    data() {
      return {
        questionNumber: 0,
        selectedInteractionIndex: 0,
        pastTries: [],
        currentTry: null,
        masteryLogId: null,
      };
    },
    computed: {
      pastattempts() {
        return this.currentTry ? this.currentTry.attemptlogs : [];
      },
      completionTimestamp() {
        const time = this.pastattempts.length
          ? this.pastattempts
              .map(a => a.end_timestamp)
              .sort()
              .slice(-1)[0]
          : null;
        return time ? new Date(time) : null;
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
      timeSpent() {
        return this.currentTry ? this.currentTry.time_spent : 0;
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
      this.loadAllTries();
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
        const getParams = { content_id: this.contentId, user_id: this.userId };
        let promise;
        if (this.masteryLogId) {
          promise = MasteryLogResource.fetchDiff(this.masteryLogId);
        } else {
          promise = MasteryLogResource.fetchMostRecentDiff(getParams);
        }
        promise.then(currentTry => {
          this.currentTry = currentTry;
        });
      },
      loadAllTries() {
        MasteryLogResource.fetchSummary({ content_id: this.contentId, user_id: this.userId }).then(
          pastTries => {
            this.pastTries = pastTries;
          }
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  .no-exercise {
    text-align: center;
  }

  .report {
    margin: auto;
  }

</style>
