<template>

  <multi-pane-layout ref="multiPaneLayout">
    <attempt-summary
      slot="header"
      :exerciseTitle="exercise.title"
      :userName="user.full_name"
      :kind="exercise.kind"
      :summaryLog="summaryLog"
    />
    <attempt-log-list
      slot="aside"
      :attemptLogs="attemptLogs"
      :selectedQuestionNumber="attemptLogIndex"
      @select="navigateToNewAttempt($event)"
    />
    <div slot="main" class="exercise-section">
      <h3>{{ $tr('question', {questionNumber: currentAttemptLog.questionNumber}) }}</h3>
      <k-checkbox
        :label="$tr('showCorrectAnswerLabel')"
        :checked="showCorrectAnswer"
        @change="toggleShowCorrectAnswer"
      />
      <interaction-list
        v-if="!showCorrectAnswer"
        :interactions="currentInteractionHistory"
        :selectedInteractionIndex="interactionIndex"
        @select="navigateToNewInteraction($event)"
      />
      <content-renderer
        v-if="currentInteraction"
        :id="exercise.pk"
        :itemId="currentAttemptLog.item"
        :assessment="true"
        :allowHints="false"
        :kind="exercise.kind"
        :files="exercise.files"
        :contentId="exercise.content_id"
        :channelId="channelId"
        :available="exercise.available"
        :answerState="answerState"
        :showCorrectAnswer="showCorrectAnswer"
        :interactive="false"
        :extraFields="exercise.extra_fields"
      />
    </div>
  </multi-pane-layout>

</template>


<script>

  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import attemptLogList from 'kolibri.coreVue.components.attemptLogList';
  import interactionList from 'kolibri.coreVue.components.interactionList';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import multiPaneLayout from 'kolibri.coreVue.components.multiPaneLayout';
  import attemptSummary from './attempt-summary';

  export default {
    name: 'learnerExerciseReport',
    $trs: {
      backPrompt: 'Back to { backTitle }',
      showCorrectAnswerLabel: 'Show correct answer',
      question: 'Question { questionNumber, number }',
    },
    components: {
      contentRenderer,
      attemptSummary,
      attemptLogList,
      interactionList,
      kCheckbox,
      multiPaneLayout,
    },
    data() {
      return {
        showCorrectAnswer: false,
      };
    },
    computed: {
      // Do not pass in answerState if showCorrectAnswer is set to true
      // answerState has a precedence over showCorrectAnswer
      answerState() {
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
      navigateToNewAttempt(attemptLogIndex) {
        this.showCorrectAnswer = false;
        this.$router.push({
          name: this.pageName,
          params: {
            channelId: this.channelId,
            userId: this.user.id,
            contentId: this.exercise.pk,
            interactionIndex: 0,
            attemptLogIndex,
          },
        });
        this.$refs.multiPaneLayout.scrollMainToTop();
      },
      navigateToNewInteraction(interactionIndex) {
        this.$router.push({
          name: this.pageName,
          params: {
            channelId: this.channelId,
            userId: this.user.id,
            contentId: this.exercise.pk,
            attemptLogIndex: this.attemptLogIndex,
            interactionIndex,
          },
        });
      },
      toggleShowCorrectAnswer() {
        this.showCorrectAnswer = !this.showCorrectAnswer;
        this.$forceUpdate();
      },
    },
    vuex: {
      getters: {
        interactionIndex: state => state.pageState.interactionIndex,
        currentAttemptLog: state => state.pageState.currentAttemptLog,
        attemptLogs: state =>
          state.pageState.attemptLogs.map(attempt => ({
            ...attempt,
            num_coach_contents: state.pageState.exercise.num_coach_contents,
          })),
        currentInteraction: state => state.pageState.currentInteraction,
        currentInteractionHistory: state => state.pageState.currentInteractionHistory,
        classId: state => state.classId,
        channelId: state => state.pageState.channelId,
        user: state => state.pageState.user,
        exercise: state => state.pageState.exercise,
        summaryLog: state => state.pageState.summaryLog,
        pageName: state => state.pageName,
        attemptLogIndex: state => state.pageState.attemptLogIndex,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exercise-section
    background-color: $core-bg-light
    padding: 16px
    h3
      margin-top: 0

</style>
