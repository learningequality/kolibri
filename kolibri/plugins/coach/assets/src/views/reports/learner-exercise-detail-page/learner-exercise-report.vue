<template>

  <div class="learner-exercise-report">
    <div class="pure-u-1-1">
      <attempt-summary
        :exerciseTitle="exercise.title"
        :userName="user.full_name"
        :kind="exercise.kind"
        :summaryLog="summaryLog"
      />
    </div>
    <div class="details-container">
      <div class="attempt-log-container pure-u-1-3">
        <attempt-log-list
          v-if="isExercise"
          :attemptLogs="attemptLogs"
          :selectedQuestionNumber="attemptLogIndex"
          @select="navigateToNewAttempt($event)"
        />
      </div>
      <div class="exercise-container pure-u-2-3">
        <interaction-list
          v-if="isExercise"
          :interactions="currentInteractionHistory"
          :selectedInteractionIndex="interactionIndex"
          :attemptNumber="currentAttemptLog.questionNumber"
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
          :answerState="currentInteraction.answer"
          :interactive="false"
          :extraFields="exercise.extra_fields"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import attemptSummary from './attempt-summary';
  import attemptLogList from '../../attempt-log-list';
  import interactionList from '../../interaction-list';
  export default {
    name: 'learnerExerciseReport',
    $trs: { backPrompt: 'Back to { backTitle }' },
    components: {
      contentRenderer,
      attemptSummary,
      attemptLogList,
      interactionList,
    },
    computed: {
      isExercise() {
        return this.exercise.kind === ContentNodeKinds.EXERCISE;
      },
    },
    methods: {
      navigateToNewAttempt(attemptLogIndex) {
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
    },
    vuex: {
      getters: {
        interactionIndex: state => state.pageState.interactionIndex,
        currentAttemptLog: state => state.pageState.currentAttemptLog,
        attemptLogs: state => state.pageState.attemptLogs,
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

  $container-side-padding = 15px

  .details-container
    width: 100%
    height: 85%
    padding-top: $container-side-padding
    clearfix()

  .attempt-log-container
    width: 30%
    height: 100%
    overflow-y: auto
    float: left

  .exercise-container
    width: 70%
    height: 100%
    padding: $containerSidePadding
    float: left

</style>
