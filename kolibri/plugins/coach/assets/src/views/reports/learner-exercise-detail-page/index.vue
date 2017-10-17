<template>

  <immersive-full-screen :backPageLink="backPageLink" :backPageText="backPageText">
    <template>
      <div class="summary-container">
        <attempt-summary
          :exerciseTitle="exercise.title"
          :userName="user.full_name"
          :kind="exercise.kind"
          :summaryLog="summaryLog" />
      </div>
      <div class="details-container">
        <div class="attempt-log-container">
          <attempt-log-list
            :attemptLogs="attemptLogs"
            :selectedQuestionNumber="attemptLogIndex"
            @select="navigateToNewAttempt($event)"
          />
        </div>
        <div class="exercise-container">
          <interaction-list
            :interactions="currentInteractionHistory"
            :selectedInteractionIndex="interactionIndex"
            :attemptNumber="currentAttemptLog.questionNumber"
            @select="navigateToNewInteraction($event)"
          />

          <content-renderer
            class="content-renderer"
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
            :extraFields="exercise.extra_fields" />
        </div>
      </div>
    </template>
  </immersive-full-screen>

</template>


<script>

  import * as constants from '../../../constants';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import attemptSummary from './attempt-summary';
  import attemptLogList from '../../attempt-log-list';
  import interactionList from '../../interaction-list';
  export default {
    name: 'coachExerciseRenderPage',
    $trs: { backPrompt: 'Back to { backTitle }' },
    components: {
      immersiveFullScreen,
      contentRenderer,
      attemptSummary,
      attemptLogList,
      interactionList,
    },
    computed: {
      backPageLink() {
        if (this.pageName === constants.PageNames.RECENT_LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.RECENT_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.exercise.pk,
            },
          };
        }
        if (this.pageName === constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.TOPIC_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.exercise.pk,
            },
          };
        }
        if (this.pageName === constants.PageNames.LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.LEARNER_ITEM_LIST,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              userId: this.user.id,
              topicId: this.parentTopic.pk,
            },
          };
        }
        return undefined;
      },
      backPageText() {
        if (constants.LearnerReports.includes(this.pageName)) {
          return this.$tr('backPrompt', { backTitle: this.parentTopic.title });
        }
        return this.$tr('backPrompt', { backTitle: this.exercise.title });
      },
      parentTopic() {
        return this.exercise.ancestors[this.exercise.ancestors.length - 1];
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
