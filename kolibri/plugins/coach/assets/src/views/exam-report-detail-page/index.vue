<template>

  <immersive-full-screen
    :backPageLink="backPageLink"
    :backPageText="$tr('backTo', { title: exam.title })"
  >
    <template>
      <div class="summary-container">
        <page-status
          :contentName="exam.title"
          :userName="userName"
          :questions="examAttempts"
          :completionTimestamp="completionTimestamp"
          :completed="closed" />
      </div>
      <div class="details-container">
        <div class="attempt-log-container">
          <attempt-log-list
            :attemptLogs="examAttempts"
            :selectedQuestionNumber="questionNumber"
            @select="navigateToAttempt"
          />
        </div>
        <div class="exercise-container">
          <interaction-list
            :interactions="currentInteractionHistory"
            :attemptNumber="currentAttempt.questionNumber"
            :selectedInteractionIndex="selectedInteractionIndex"
            @select="navigateToInteraction"
          />

          <content-renderer
            v-if="currentInteraction"
            class="content-renderer"
            :id="exercise.pk"
            :itemId="itemId"
            :allowHints="false"
            :kind="exercise.kind"
            :files="exercise.files"
            :contentId="exercise.content_id"
            :channelId="channelId"
            :available="exercise.available"
            :answerState="currentInteraction.answer"
            :extraFields="exercise.extra_fields"
            :interactive="false"
            :assessment="true" />
          <content-renderer
            v-else
            class="content-renderer"
            :id="exercise.pk"
            :itemId="itemId"
            :allowHints="false"
            :kind="exercise.kind"
            :files="exercise.files"
            :contentId="exercise.content_id"
            :channelId="channelId"
            :available="exercise.available"
            :extraFields="exercise.extra_fields"
            :interactive="false"
            :assessment="true" />
        </div>
      </div>
    </template>
  </immersive-full-screen>

</template>


<script>

  import * as constants from '../../constants';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import pageStatus from './page-status';
  import attemptLogList from '../attempt-log-list';
  import interactionList from '../interaction-list';
  export default {
    name: 'coachExamDetailPage',
    $trs: { backTo: 'Back to exam report for { title }' },
    components: {
      immersiveFullScreen,
      contentRenderer,
      pageStatus,
      attemptLogList,
      interactionList,
    },
    computed: {
      backPageLink() {
        return {
          name: constants.PageNames.EXAM_REPORT,
          params: {
            classId: this.classId,
            channelId: this.channelId,
            examId: this.exam.id,
          },
        };
      },
    },
    methods: {
      navigateToAttempt(questionNumber) {
        this.navigateTo(questionNumber, 0);
      },
      navigateToInteraction(interaction) {
        this.navigateTo(this.questionNumber, interaction);
      },
      navigateTo(question, interaction) {
        this.$router.push({
          name: constants.PageNames.EXAM_REPORT_DETAIL,
          params: {
            channelId: this.channelId,
            classId: this.classId,
            userId: this.userId,
            interaction,
            question,
            examId: this.exam.id,
          },
        });
      },
    },
    vuex: {
      getters: {
        channelId: state => state.pageState.channelId,
        classId: state => state.classId,
        examAttempts: state => state.pageState.examAttempts,
        exam: state => state.pageState.exam,
        userName: state => state.pageState.user.full_name,
        userId: state => state.pageState.user.id,
        currentAttempt: state => state.pageState.currentAttempt,
        currentInteractionHistory: state => state.pageState.currentInteractionHistory,
        currentInteraction: state => state.pageState.currentInteraction,
        selectedInteractionIndex: state => state.pageState.interactionIndex,
        questionNumber: state => state.pageState.questionNumber,
        exercise: state => state.pageState.exercise,
        itemId: state => state.pageState.itemId,
        completionTimestamp: state => state.pageState.examLog.completion_timestamp,
        closed: state => state.pageState.examLog.closed,
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
