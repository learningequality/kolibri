<template>

  <MultiPaneLayout ref="multiPaneLayout">
    <AttemptSummary
      slot="header"
      :exerciseTitle="exercise.title"
      :userName="user.full_name"
      :kind="exercise.kind"
      :summaryLog="summaryLog"
    />
    <AttemptLogList
      slot="aside"
      :attemptLogs="attemptLogs"
      :selectedQuestionNumber="attemptLogIndex"
      @select="navigateToNewAttempt($event)"
    />
    <div slot="main" class="exercise-section">
      <h3>{{ $tr('question', {questionNumber: currentAttemptLog.questionNumber}) }}</h3>
      <KCheckbox
        :label="$tr('showCorrectAnswerLabel')"
        :checked="showCorrectAnswer"
        @change="toggleShowCorrectAnswer"
      />
      <InteractionList
        v-if="!showCorrectAnswer"
        :interactions="currentInteractionHistory"
        :selectedInteractionIndex="interactionIndex"
        @select="navigateToNewInteraction($event)"
      />
      <ContentRenderer
        v-if="currentInteraction"
        :id="exercise.id"
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
  </MultiPaneLayout>

</template>


<script>

  import { mapState } from 'vuex';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import AttemptLogList from 'kolibri.coreVue.components.AttemptLogList';
  import InteractionList from 'kolibri.coreVue.components.InteractionList';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import AttemptSummary from './AttemptSummary';

  export default {
    name: 'LearnerExerciseReport',
    metaInfo() {
      return {
        title: this.exercise.title,
      };
    },
    $trs: {
      backPrompt: 'Back to { backTitle }',
      showCorrectAnswerLabel: 'Show correct answer',
      question: 'Question { questionNumber, number }',
    },
    components: {
      ContentRenderer,
      AttemptSummary,
      AttemptLogList,
      InteractionList,
      KCheckbox,
      MultiPaneLayout,
    },
    data() {
      return {
        showCorrectAnswer: false,
      };
    },
    computed: {
      ...mapState(['pageName', 'classId']),
      ...mapState({
        channelId: state => state.pageState.channelId,
        interactionIndex: state => state.pageState.interactionIndex,
        currentAttemptLog: state => state.pageState.currentAttemptLog,
        attemptLogs: state =>
          state.pageState.attemptLogs.map(attempt => ({
            ...attempt,
            num_coach_contents: state.pageState.exercise.num_coach_contents,
          })),
        currentInteraction: state => state.pageState.currentInteraction,
        currentInteractionHistory: state => state.pageState.currentInteractionHistory,
        user: state => state.pageState.user,
        exercise: state => state.pageState.exercise,
        summaryLog: state => state.pageState.summaryLog,
        attemptLogIndex: state => state.pageState.attemptLogIndex,
      }),
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
            contentId: this.exercise.id,
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
            contentId: this.exercise.id,
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
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .exercise-section {
    padding: 16px;
    background-color: $core-bg-light;
    h3 {
      margin-top: 0;
    }
  }

</style>
