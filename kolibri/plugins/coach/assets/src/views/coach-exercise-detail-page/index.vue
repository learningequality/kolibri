<template>

  <immersive-full-screen :backPageLink="backPageLink">
    <template slot="text"> Figure out with designers what this is supposed to say </template>
    <template slot="body">
      <div class="page-status-container">
        <page-status
          :contentName="exercise.title"
          :userName="userName"
          :progress="exercise.progress_fraction"
          :assessment="assessment"
          :date="date"/>
      </div>
      <div class="outer-container">
        <div class="attempt-log-container column">
          <attempt-log-list
            :attempt-logs="attemptLogs"
            :selectedAttemptId="currentAttemptLog.id"
            @select="navigateToNewAttempt($event)"
          />
        </div>
        <div class="exercise-container column">
          <interaction-list
            :interactions="currentInteractionHistory"
            :selectedInteractionIndex="interactionIndex"
            :attemptNumber="currentAttemptLog.id"
            @select="navigateToNewInteraction($event)"
          />

          <content-renderer
            class="content-renderer"
            :id="exercise.content_id"
            :itemId="currentAttemptLog.item"
            :allowHints="false"
            :kind="exercise.kind"
            :files="exercise.files"
            :contentId="exercise.content_id"
            :channelId="channelId"
            :available="exercise.available"
            :answerState="currentInteraction.answer"
            :extraFields="exercise.extra_fields"/>
        </div>
      </div>
    </template>
  </immersive-full-screen>

</template>


<script>

  const constants = require('../../constants');

  module.exports = {
    $trNameSpace: 'coachExerciseRenderPage',
    $trs: {
      backto: 'Back to { text }',
    },
    components: {
      'immersive-full-screen': require('kolibri.coreVue.components.immersiveFullScreen'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'page-status': require('./page-status'),
      'attempt-log-list': require('./attempt-log-list'),
      'interaction-list': require('./interaction-list'),
    },
    computed: {
      backPageLink() {
        // TODO figure out how this is going to the tab we were on prior
        return { name: constants.PageNames.CLASS_LIST };
      },
      assessment() {
        return 'Number completed, can calc from progress';
      },
      date() {
        return 'Date (check with designers)';
      },
    },
    methods: {
      backtoText(text) {
        return this.$tr('backto', { text });
      },
      navigateToNewAttempt(attemptId) {
        this.$router.push({
          name: constants.PageNames.EXERCISE_RENDER,
          params: {
            channelId: this.channelId,
            userId: this.userId,
            contentId: this.exercise.content_id,
            interactionIndex: 0, // is this the first? will it always be?
            attemptId,
          },
        });
      },
      navigateToNewInteraction(interactionIndex) {
        this.$router.push({
          name: constants.PageNames.EXERCISE_RENDER,
          params: {
            channelId: this.channelId,
            userId: this.userId,
            contentId: this.exercise.content_id,
            attemptId: this.currentAttemptLog.id,
            interactionIndex,
          },
        });
      },
    },
    vuex: {
      getters: {
        // pageState: state => state.pageState,
        interactionIndex: state => state.pageState.interactionIndex,
        currentAttemptLog: state => state.pageState.currentAttemptLog,
        attemptLogs: state => state.pageState.attemptLogs,
        currentInteraction: state => state.pageState.currentInteraction,
        currentInteractionHistory: state => state.pageState.currentInteractionHistory,
        channelId: state => state.pageState.channelId,
        attemptId: state => state.pageState.attemptId,
        userId: state => state.pageState.userId,
        exercise: state => state.pageState.exercise,
        userName: state => state.core.session.username,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .column
    float: left

  .page-status-container
    padding-top: 20px
    padding-left: 10px
    padding-right: 10px

  .outer-container
    display: table-cell
    height: 100%
    width: 1%
    padding: 10px

  .attempt-log-container
    width: 30%
    height: 100%
    overflow-y: auto

  .exercise-container
    width: 70%

</style>
