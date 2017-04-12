<template>

  <immersive-full-screen :backPageLink="backPageLink">
    <template slot="text"> {{ $tr('backToExamList') }} </template>
    <template slot="body">
      <div class="container">
        <div class="exam-status-container">
          <mat-svg class="exam-icon" slot="content-icon" category="action" name="assignment"/>
          <h1 class="exam-title">{{ exam.title }}</h1>
          <div class="exam-status">
            <p class="questions-answered">{{ $tr('questionsAnswered', { numAnswered: questionsAnswered, numTotal: exam.questionCount }) }}</p>
            <icon-button class="submit-exam-button" @click="finishExam" :text="$tr('submitExam')"></icon-button>
          </div>
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
              <div class="question-navbutton-container">
                <icon-button :disabled="questionNumber===0" @click="goToQuestion(questionNumber - 1)" :text="$tr('previousQuestion')"><mat-svg category="navigation" name="chevron_left"/></icon-button>
                <icon-button :disabled="questionNumber===exam.questionCount-1" @click="goToQuestion(questionNumber + 1)" :text="$tr('nextQuestion')"><mat-svg category="navigation" name="chevron_right"/></icon-button>
              </div>
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
      actions: {
        setAndSaveCurrentExamAttemptLog: actions.setAndSaveCurrentExamAttemptLog,
      }
    },
    methods: {
      goToQuestion(questionNumber) {
        const answer = this.$refs.contentRenderer.checkAnswer();
        if (answer) {
          const attempt = this.currentAttempt;
          attempt.answer = answer.answerState;
          attempt.simple_answer = answer.simpleAnswer;
          attempt.correct = answer.correct;
          if (!attempt.completion_timestamp) {
            attempt.completion_timestamp = new Date();
          }
          attempt.end_timestamp = new Date();
          attempt.interaction_history.push({
            type: InteractionTypes.answer,
            answer: answer.answerState,
            correct: answer.correct,
          });
          this.setAndSaveCurrentExamAttemptLog(this.content.id, this.itemId, attempt);
        }
        this.$router.push({
          name: PageNames.EXAM,
          params: { channel_id: this.channelId, id: this.exam.id, questionNumber },
        });
      },
      finishExam() {

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

  @require '~kolibri.styles.definitions'

  .container
    width: 90%
    margin: 30px auto
    position: relative

  .exam-status-container
    padding: 10px 25px
    background: $core-bg-light
    
  .exam-status
    float: right
    width: 50%
    max-width: 400px
    text-align: right
    margin-top: 15px
    
  .exam-icon
    position: relative
    top: 4px
    margin-right: 5px
    fill: $core-text-default
    
  .exam-title
    display: inline-block
    
  .submit-exam-button
    margin-left: 10px
    
  .questions-answered
    display: inline-block
    position: relative
    top: 2px

  .question-container
    height: 100%
    width: 100%
    padding: 10px
    background: $core-bg-light

  .outer-container > div
    float: left

  .answer-history-container
    width: 30%
    height: 100%
    overflow-y: auto

  .exercise-container
    width: 70%
    
  .question-navbutton-container
    text-align: right
    margin-right: 15px

</style>
