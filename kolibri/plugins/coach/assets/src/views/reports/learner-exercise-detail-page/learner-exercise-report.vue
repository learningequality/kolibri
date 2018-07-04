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
          :attemptNumber="currentAttemptLog.questionNumber || 0"
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

  import { mapState } from 'vuex';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import attemptLogList from 'kolibri.coreVue.components.attemptLogList';
  import interactionList from 'kolibri.coreVue.components.interactionList';
  import attemptSummary from './attempt-summary';

  export default {
    name: 'learnerExerciseReport',
    $trs: { backPrompt: 'Back to { backTitle }' },
    metaInfo() {
      return {
        title: this.exercise.title,
      };
    },
    components: {
      contentRenderer,
      attemptSummary,
      attemptLogList,
      interactionList,
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
