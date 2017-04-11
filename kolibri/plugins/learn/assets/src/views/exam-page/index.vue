<template>

  <immersive-full-screen :backPageLink="backPageLink">
    <template slot="text"> {{ $tr('backToExamList') }} </template>
    <template slot="body">
      <div class="container">
        <div class="exam-status-container">
          <mat-svg slot="content-icon" category="action" name="assignment"/>{{ exam.title }}
          {{ $tr('questionsAnswered', { numAnswered: questionsAnswered, numTotal: exam.questionCount }) }}
          <icon-button @click="finishExam" :text="$tr('submitExam')"></icon-button>
        </div>
        <div class="question-container">
          <div class="outer-container">
            <div class="answer-history-container column">
              <answer-history
              :questionNumber="questionNumber"
              @goToQuestion="goToQuestion"/>
            </div>
          <div class="exercise-container column">
            <content-renderer
              class="content-renderer"
              ref="contentRenderer"
              :id="content.id"
              :kind="content.kind"
              :files="content.files"
              :contentId="content.content_id"
              :channelId="channelId"
              :available="content.available"
              :extraFields="content.extra_fields"
              :itemId="itemId"
              :assessment="true"
              :allowHints="false"/>
            <icon-button :disabled="questionNumber===0" @click="goToQuestion(questionNumber - 1)" :text="$tr('previousQuestion')"></icon-button>
            <icon-button :disabled="questionNumber===exam.questionCount-1" @click="goToQuestion(questionNumber + 1)" :text="$tr('nextQuestion')"></icon-button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </immersive-full-screen>

</template>


<script>

  const PageNames = require('../../constants').PageNames;
  const InteractionTypes = require('kolibri.coreVue.vuex.constants').InteractionTypes;
  const actions = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'examPage',
    $trs: {
      submitExam: 'Submit exam',
      backToExamList: 'Back to exam list',
      questionsAnswered: '{numAnswered, number} of {numTotal, number} {numTotal, plural, one {question} other {questions}} answered',
      previousQuestion: 'Previous question',
      nextQuestion: 'Next question',
    },
    components: {
      'immersive-full-screen': require('kolibri.coreVue.components.immersiveFullScreen'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'answer-history': require('./answer-history'),
    },
    vuex: {
      getters: {
        exam: state => state.pageState.exam,
        channelId: state => state.pageState.channelId,
        content: state => state.pageState.content,
        itemId: state => state.pageState.itemId,
        questionNumber: state => state.pageState.questionNumber,
        attemptLogs: state => state.examAttemptLogs,
        currentAttempt: state =>
          state.examAttemptLogs[state.pageState.content.id][state.pageState.itemId],
      },
    },
    methods: {
      goToQuestion(questionNumber) {
        this.$router.push({
          name: PageNames.EXAM,
          params: { channel_id: this.channelId, id: this.exam.id, questionNumber },
        });
      },
    },
    computed: {
      backPageLink() {
        return {
          name: PageNames.EXAM_LIST,
          params: { channel_id: this.channelId },
        };
      },
      questionsAnswered() {
        return Object.keys(this.attemptLogs).length;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .exam-status-container
    padding-top: 20px
    padding-left: 10px
    padding-right: 10px

  .question-container
    height: 100%
    width: 100%
    padding: 10px

  .outer-container > div
    float: left

  .answer-history-container
    width: 30%
    height: 100%
    overflow-y: auto

  .exercise-container
    width: 70%

</style>
