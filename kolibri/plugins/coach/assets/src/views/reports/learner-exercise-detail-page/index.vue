<template>

  <immersive-full-screen :backPageLink="backPageLink">
    <template slot="text"> {{ $tr('backPrompt', {exerciseTitle: exercise.title}) }} </template>
    <template slot="body">
      <div class="summary-container">
        <attempt-summary
          :exerciseTitle="exercise.title"
          :userName="user.full_name"
          :summaryLog="summaryLog"/>
      </div>
      <div class="details-container">
        <div class="attempt-log-container">
          <attempt-log-list
            :attempt-logs="attemptLogs"
            :selectedQuestionNumber="currentAttemptLog.questionNumber"
            @select="navigateToNewAttempt($event)"
          />
        </div>
        <div class="exercise-container">
          <interaction-list
            :interactions="currentInteractionHistory"
            :selectedInteractionIndex="interactionIndex"
            :attemptNumber="currentAttemptLog.id"
            @select="navigateToNewInteraction($event)"
          />

          <content-renderer
            class="content-renderer"
            :id="exercise.pk"
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

  const constants = require('../../../constants');

  module.exports = {
    $trNameSpace: 'coachExerciseRenderPage',
    $trs: {
      backPrompt: 'Back to { exerciseTitle }',
    },
    components: {
      'immersive-full-screen': require('kolibri.coreVue.components.immersiveFullScreen'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'attempt-summary': require('./attempt-summary'),
      'attempt-log-list': require('./attempt-log-list'),
      'interaction-list': require('./interaction-list'),
    },
    computed: {
      backPageLink() {
        if (this.pageName === constants.PageNames.RECENT_LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.RECENT_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.contentId,
            }
          };
        }
        if (this.pageName === constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.TOPIC_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.contentId,
            }
          };
        }
        return {
          name: constants.PageNames.LEARNER_ITEM_LIST,
          params: {
            classId: this.classId,
            channelId: this.channelId,
            contentId: this.contentId,
          }
        };
      },
    },
    methods: {
      backtoText(text) {
        return this.$tr('backto', { text });
      },
      navigateToNewAttempt(questionNumber) {
        this.$router.push({
          name: this.pageName,
          params: {
            channelId: this.channelId,
            userId: this.user.id,
            contentId: this.exercise.content_id,
            interactionIndex: 0,
            questionNumber,
          },
        });
      },
      navigateToNewInteraction(interactionIndex) {
        this.$router.push({
          name: this.pageName,
          params: {
            channelId: this.channelId,
            userId: this.user.id,
            contentId: this.exercise.content_id,
            questionNumber: this.currentAttemptLog.questionNumber,
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
        user: state => state.pageState.user,
        exercise: state => state.pageState.exercise,
        summaryLog: state => state.pageState.summaryLog,
        pageName: state => state.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $container-side-padding = 15px

  .summary-container
    padding-top: $container-side-padding
    padding-left: $container-side-padding
    padding-right: $container-side-padding
    height: 15%

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
