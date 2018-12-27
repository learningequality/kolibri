<template>

  <MultiPaneLayout ref="multiPaneLayout">
    <AttemptSummary
      slot="header"
      :exerciseTitle="exercise.title"
      :userName="user.full_name"
      :kind="exercise.kind"
      :summaryLog="summaryLog"
    />
    <template v-if="attemptLogs.length > 0">
      <AttemptLogList
        slot="aside"
        :attemptLogs="attemptLogsWithCoachContents"
        :selectedQuestionNumber="attemptLogIndex"
        @select="navigateToNewAttempt($event)"
      />
      <div slot="main" class="exercise-section" :style="{ backgroundColor: $coreBgLight }">
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
    </template>
  </MultiPaneLayout>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import AttemptLogList from 'kolibri.coreVue.components.AttemptLogList';
  import InteractionList from 'kolibri.coreVue.components.InteractionList';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import AttemptSummary from './AttemptSummary';

  export default {
    name: 'LearnerExerciseReportOld',
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
      ...mapState(['pageName', 'classId', 'reportRefreshInterval']),
      ...mapGetters(['$coreBgLight']),
      ...mapGetters('exerciseDetail', [
        'currentAttemptLog',
        'currentInteraction',
        'currentInteractionHistory',
      ]),
      ...mapState('exerciseDetail', [
        'attemptLogs',
        'attemptLogIndex',
        'channelId',
        'exercise',
        'interactionIndex',
        'summaryLog',
        'user',
      ]),
      attemptLogsWithCoachContents() {
        return this.attemptLogs.map(attempt => ({
          ...attempt,
          num_coach_contents: this.exercise.num_coach_contents,
        }));
      },
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
    mounted() {
      this.intervalId = setInterval(this.refreshReportData, this.reportRefreshInterval);
    },
    beforeDestroy() {
      this.intervalId = clearInterval(this.intervalId);
    },
    methods: {
      // Data to do a proper refresh. See showExerciseDetailView for details.
      refreshReportData() {
        return this.$store.dispatch('exerciseDetail/setAttemptLogs', {
          userId: this.user.id,
          exercise: this.exercise,
          shouldSetAttemptLogs: true,
          isSamePage: samePageCheckGenerator(this.$store),
        });
      },
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

  .exercise-section {
    padding: 16px;
    h3 {
      margin-top: 0;
    }
  }

</style>
