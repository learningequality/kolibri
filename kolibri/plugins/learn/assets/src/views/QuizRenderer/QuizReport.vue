<template>

  <MultiPaneLayout ref="multiPaneLayout" class="container">
    <template #header>
      <KFixedGrid
        numCols="4"
        class="page-status"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <KFixedGridItem span="3">
          <div>
            <h1 class="title">
              <KLabeledIcon icon="person" :label="userName" />
            </h1>
            <KLabeledIcon icon="quiz" :label="content.title" />
          </div>
          <!-- only show the current try if the user has only one try -->
          <TriesOverview
            :progress="1"
            :maxQuestionsCorrect="maxQuestionsCorrect"
            :bestScore="bestScore"
            :totalQuestions="questions.length"
            :completionTimestamp="completionTimestamp"
            :completed="true"
            :bestTimeSpent="bestTimeSpent"
          />
        </KFixedGridItem>
        <KFixedGridItem span="1" alignment="right">
          <KButton @click="$emit('repeat')">
            {{ coreString('tryAgainButton') }}
          </KButton>
        </KFixedGridItem>
      </KFixedGrid>
    </template>

    <template #main>
      <ExamReport
        v-if="currentTry"
        :examAttempts="quizAttempts"
        class="report"
        :exam="content"
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
        :timeSpent="timeSpent"
        @repeat="$emit('repeat')"
      >
        <template #header>
          <KSelect
            v-if="pastTriesOptions"
            v-model="selectedTry"
            :label="coreString('attemptDropdownLabel')"
            appearance="flat-button"
            class="try-selection"
            :options="pastTriesOptions"
          />
          <CurrentTryOverview
            :progress="1"
            :questionsCorrect="questionsCorrect"
            :questionsCorrectText="questionsCorrectText"
            :score="score"
            :totalQuestions="questions.length"
            :completionTimestamp="completionTimestamp"
            :completed="true"
            :timeSpent="timeSpent"
            :timeSpentText="timeSpentText"
            :diff="null"
            :hideStatus="true"
          />
        </template>
      </ExamReport>
    </template>
  </MultiPaneLayout>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import PageStatus from 'kolibri.coreVue.components.PageStatus';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import { MasteryLogResource } from 'kolibri.resources';
  import { now } from 'kolibri.utils.serverClock';
  import commonLearnStrings from '../commonLearnStrings';
  import TriesOverview from './TriesOverview';

  export default {
    name: 'QuizReport',
    components: {
      ExamReport,
      MultiPaneLayout,
      CurrentTryOverview: PageStatus.components.CurrentTryOverview,
      TriesOverview,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
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
        now: now(),
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
          if (attempt && attempt.diff) {
            if (attempt.correct === attempt.diff.correct) {
              attempt.diff.text =
                attempt.correct >= 1
                  ? this.learnString('answerLogImprovedLabel')
                  : this.learnString('answerLogIncorrectLabel');
            } else if (!attempt.correct && attempt.diff.correct < 0) {
              attempt.diff.text = this.learnString('answerLogCorrectLabel');
            }
          }
          return {
            ...(attempt || {}),
            noattempt,
            questionNumber,
          };
        });
      },
      content() {
        // TODO: REPLACE THIS
        return { title: 'test' };
      },
      questionsCorrect() {
        return this.currentTry ? this.currentTry.correct : 0;
      },
      questionsCorrectText() {
        return this.currentTry && this.currentTry.diff && this.currentTry.diff.correct > 0
          ? this.learnString('practiceQuizReportImprovedLabel', {
              value: this.currentTry.diff.correct,
            })
          : null;
      },
      score() {
        return this.questionsCorrect / this.questions.length;
      },
      timeSpent() {
        return this.currentTry ? this.currentTry.time_spent : 0;
      },
      timeSpentText() {
        const fasterTime =
          this.currentTry && this.currentTry.diff && this.currentTry.diff.time_spent < 0
            ? Math.floor(Math.abs(this.currentTry.diff.time_spent / 60))
            : 0;

        return fasterTime >= 1
          ? this.coreString('practiceQuizReportFasterTimeLabel', { value: fasterTime })
          : null;
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
      pastTriesOptions() {
        return this.pastTries.map(quizTry => {
          const score = Math.floor((quizTry.correct / this.questions.length) * 100);
          const time = this.$formatRelative(quizTry.completion_timestamp, { now: this.now });
          return {
            value: quizTry.id,
            label: `(${score}%) ${time}`,
          };
        });
      },
      bestTimeSpent() {
        return Math.min(...this.pastTries.map(t => t.time_spent));
      },
      maxQuestionsCorrect() {
        return Math.max(...this.pastTries.map(t => t.correct));
      },
      bestScore() {
        return this.maxQuestionsCorrect / this.questions.length || 0;
      },
      selectedTry: {
        get() {
          return (
            this.pastTriesOptions.find(tryOption => tryOption.value === this.masteryLogId) ||
            this.pastTriesOptions[0]
          );
        },
        set(option) {
          this.masteryLogId = option.value;
          this.loadAttempts();
        },
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
        let promise;
        if (this.masteryLogId) {
          promise = MasteryLogResource.fetchDiff(this.masteryLogId);
        } else {
          const getParams = { content_id: this.contentId, user_id: this.userId };
          promise = MasteryLogResource.fetchMostRecentDiff(getParams);
        }
        promise.then(currentTry => {
          this.masteryLogId = currentTry.id;
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

  .container {
    top: 24px;
    max-width: 1000px;
    margin: 0 auto;
    background-color: white;
  }

  .try-selection {
    max-width: 400px;
    padding: 5px;
  }
  .report {
    margin: auto;
  }

</style>
