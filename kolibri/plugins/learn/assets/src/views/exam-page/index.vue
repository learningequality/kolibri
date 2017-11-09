<template>

  <immersive-full-screen
    v-if="exam"
    :backPageLink="backPageLink"
    :backPageText="$tr('backToExamList')"
  >
    <template>
      <div class="container">
        <div class="exam-status-container">
          <mat-svg class="exam-icon" slot="content-icon" category="action" name="assignment_late" />
          <h1 class="exam-title">{{ exam.title }}</h1>
          <div class="exam-status">
            <p class="questions-answered">{{ $tr('questionsAnswered', { numAnswered: questionsAnswered, numTotal: exam.questionCount }) }}</p>
            <k-button @click="toggleModal" :text="$tr('submitExam')" :primary="true" />
          </div>
        </div>
        <div class="question-container">
          <div class="outer-container">
            <div class="answer-history-container column">
              <answer-history
              :questionNumber="questionNumber"
              @goToQuestion="goToQuestion" />
            </div>
          <div class="exercise-container column">
            <content-renderer
              class="content-renderer"
              ref="contentRenderer"
              v-if="itemId"
              :id="content.id"
              :kind="content.kind"
              :files="content.files"
              :contentId="content.content_id"
              :channelId="channelId"
              :available="content.available"
              :extraFields="content.extra_fields"
              :itemId="itemId"
              :assessment="true"
              :allowHints="false"
              :answerState="currentAttempt.answer"
              @interaction="throttledSaveAnswer" />
              <ui-alert v-else :dismissible="false" type="error">
                {{ $tr('noItemId') }}
              </ui-alert>
              <div class="question-navbutton-container">
                <k-button :disabled="questionNumber===0" @click="goToQuestion(questionNumber - 1)" :text="$tr('previousQuestion')" />
                <k-button :disabled="questionNumber===exam.questionCount-1" @click="goToQuestion(questionNumber + 1)" :text="$tr('nextQuestion')" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <core-modal v-if="submitModalOpen" :title="$tr('submitExam')" @cancel="toggleModal">
        <p>{{ $tr('areYouSure') }}</p>
        <p v-if="questionsUnanswered">{{ $tr('unanswered', { numLeft: questionsUnanswered } ) }}</p>
        <k-button :text="$tr('cancel')" appearance="flat-button" @click="toggleModal" />
        <k-button :text="$tr('submitExam')" @click="finishExam" :primary="true" />
      </core-modal>
    </template>
  </immersive-full-screen>

</template>


<script>

  import { PageNames } from '../../constants';
  import { InteractionTypes } from 'kolibri.coreVue.vuex.constants';
  import * as actions from '../../state/actions/main';
  import isEqual from 'lodash/isEqual';
  import { now } from 'kolibri.utils.serverClock';
  import throttle from 'lodash/throttle';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import answerHistory from './answer-history';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  export default {
    name: 'examPage',
    $trs: {
      submitExam: 'Submit exam',
      backToExamList: 'Back to exam list',
      questionsAnswered:
        '{numAnswered, number} of {numTotal, number} {numTotal, plural, one {question} other {questions}} answered',
      previousQuestion: 'Previous question',
      nextQuestion: 'Next question',
      cancel: 'Cancel',
      areYouSure: 'Are you sure you want to submit your exam?',
      unanswered:
        'You have {numLeft, number} {numLeft, plural, one {question} other {questions}} unanswered',
      noItemId: 'This question has an error, please move on to the next question',
    },
    components: {
      immersiveFullScreen,
      contentRenderer,
      kButton,
      answerHistory,
      coreModal,
      uiAlert,
    },
    data() {
      return {
        submitModalOpen: false,
      };
    },
    vuex: {
      getters: {
        exam: state => state.pageState.exam,
        channelId: state => state.pageState.channelId,
        content: state => state.pageState.content,
        itemId: state => state.pageState.itemId,
        questionNumber: state => state.pageState.questionNumber,
        attemptLogs: state => state.examAttemptLogs,
        currentAttempt: state => state.pageState.currentAttempt,
        questionsAnswered: state => state.pageState.questionsAnswered,
      },
      actions: {
        setAndSaveCurrentExamAttemptLog: actions.setAndSaveCurrentExamAttemptLog,
        closeExam: actions.closeExam,
      },
    },
    computed: {
      backPageLink() {
        return {
          name: PageNames.EXAM_LIST,
          params: { channel_id: this.channelId },
        };
      },
      questionsUnanswered() {
        return this.exam.questionCount - this.questionsAnswered;
      },
    },
    created() {
      this._throttledSaveAnswer = throttle(this.saveAnswer.bind(this), 500, {
        leading: false,
      });
    },
    methods: {
      checkAnswer() {
        if (this.$refs.contentRenderer) {
          return this.$refs.contentRenderer.checkAnswer();
        }
        return null;
      },
      throttledSaveAnswer(...args) {
        return this._throttledSaveAnswer(...args);
      },
      saveAnswer() {
        const answer = this.checkAnswer() || {
          answerState: null,
          simpleAnswer: '',
          correct: 0,
        };
        if (!isEqual(answer.answerState, this.currentAttempt.answer)) {
          const attempt = Object.assign({}, this.currentAttempt);
          attempt.answer = answer.answerState;
          attempt.simple_answer = answer.simpleAnswer;
          attempt.correct = answer.correct;
          if (!attempt.completion_timestamp) {
            attempt.completion_timestamp = now();
          }
          attempt.end_timestamp = now();
          attempt.interaction_history.push({
            type: InteractionTypes.answer,
            answer: answer.answerState,
            correct: answer.correct,
            timestamp: now(),
          });
          return this.setAndSaveCurrentExamAttemptLog(this.content.id, this.itemId, attempt);
        }
        return Promise.resolve();
      },
      goToQuestion(questionNumber) {
        this.saveAnswer().then(() => {
          this.$router.push({
            name: PageNames.EXAM,
            params: {
              channel_id: this.channelId,
              id: this.exam.id,
              questionNumber,
            },
          });
        });
      },
      submitExam() {
        if (!this.submitModalOpen) {
          this.saveAnswer().then(this.toggleModal);
        }
      },
      toggleModal() {
        this.submitModalOpen = !this.submitModalOpen;
      },
      finishExam() {
        this.closeExam().then(() => {
          this.$router.push(this.backPageLink);
        });
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
    width: 25%
    height: 100%
    max-height: 500px
    overflow-y: auto

  .exercise-container
    width: 75%

  .question-navbutton-container
    text-align: right
    margin-right: 15px

</style>
