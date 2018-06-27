<template>

  <immersive-full-screen
    v-if="exam"
    :backPageLink="backPageLink"
    :backPageText="$tr('backToExamList')"
  >
    <multi-pane-layout ref="multiPaneLayout">
      <div class="exam-status-container" slot="header">
        <mat-svg class="exam-icon" slot="content-icon" category="action" name="assignment_late" />
        <h1 class="exam-title">{{ exam.title }}</h1>
        <div class="exam-status">
          <p class="questions-answered">
            {{
              $tr(
                'questionsAnswered',
                { numAnswered: questionsAnswered, numTotal: exam.question_count }
              )
            }}
          </p>
          <k-button @click="toggleModal" :text="$tr('submitExam')" :primary="true" />
        </div>
        <div style="clear: both;"></div>
      </div>

      <answer-history
        slot="aside"
        :questionNumber="questionNumber"
        @goToQuestion="goToQuestion"
      />

      <div
        slot="main"
        class="question-container"
      >
        <content-renderer
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
          @interaction="handleInteraction"
        />
        <ui-alert v-else :dismissible="false" type="error">
          {{ $tr('noItemId') }}
        </ui-alert>
      </div>

      <div class="question-navbutton-container" slot="footer">
        <k-button
          :disabled="questionNumber===0"
          @click="goToQuestion(questionNumber - 1)"
          :text="$tr('previousQuestion')"
        />
        <k-button
          :disabled="questionNumber===exam.question_count-1"
          @click="goToQuestion(questionNumber + 1)"
          :text="$tr('nextQuestion')"
        />
      </div>
    </multi-pane-layout>

    <core-modal
      v-if="submitModalOpen"
      :title="$tr('submitExam')"
      @cancel="toggleModal"
    >
      <p>{{ $tr('areYouSure') }}</p>
      <p v-if="questionsUnanswered">
        {{ $tr('unanswered', { numLeft: questionsUnanswered } ) }}
      </p>
      <div class="core-modal-buttons">
        <k-button
          :text="$tr('goBack')"
          appearance="flat-button"
          @click="toggleModal"
        />
        <k-button
          :text="$tr('submitExam')"
          @click="finishExam"
          :primary="true"
        />
      </div>
    </core-modal>
  </immersive-full-screen>

</template>


<script>

  import { InteractionTypes } from 'kolibri.coreVue.vuex.constants';
  import isEqual from 'lodash/isEqual';
  import { now } from 'kolibri.utils.serverClock';
  import debounce from 'lodash/debounce';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import multiPaneLayout from 'kolibri.coreVue.components.multiPaneLayout';
  import { setAndSaveCurrentExamAttemptLog, closeExam } from '../../state/actions/main';
  import { ClassesPageNames } from '../../constants';
  import answerHistory from './answer-history';

  export default {
    name: 'examPage',
    $trs: {
      submitExam: 'Submit exam',
      backToExamList: 'Back to exam list',
      questionsAnswered:
        '{numAnswered, number} of {numTotal, number} {numTotal, plural, one {question} other {questions}} answered',
      previousQuestion: 'Previous question',
      nextQuestion: 'Next question',
      goBack: 'Go back',
      areYouSure: 'You cannot change your answers after you submit',
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
      multiPaneLayout,
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
        setAndSaveCurrentExamAttemptLog,
        closeExam,
      },
    },
    computed: {
      backPageLink() {
        return {
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
        };
      },
      questionsUnanswered() {
        return this.exam.question_count - this.questionsAnswered;
      },
    },
    methods: {
      handleInteraction() {
        this.debouncedCheckAnswer();
        this.debouncedSaveAnswer();
      },
      debouncedSaveAnswer: debounce(function() {
        this.saveAnswer();
      }, 5000),
      debouncedCheckAnswer: debounce(function() {
        this.checkAnswer();
      }, 500),
      checkAnswer() {
        if (this.$refs.contentRenderer) {
          return this.$refs.contentRenderer.checkAnswer();
        }
        return null;
      },
      saveAnswer() {
        if (this.$refs.contentRenderer) {
          const answer = this.checkAnswer();
          if (answer && !isEqual(answer.answerState, this.currentAttempt.answer)) {
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
        }
      },
      goToQuestion(questionNumber) {
        this.saveAnswer().then(() => {
          this.$router.push({
            name: ClassesPageNames.EXAM_VIEWER,
            params: {
              examId: this.exam.id,
              questionNumber,
            },
          });
          this.$refs.multiPaneLayout.scrollMainToTop();
        });
      },
      toggleModal() {
        this.submitModalOpen = !this.submitModalOpen;
      },
      finishExam() {
        this.saveAnswer.then(
          this.closeExam().then(() => {
            this.$router.push(this.backPageLink);
          })
        );
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exam-status-container
    padding: 16px
    background: $core-bg-light

  .exam-status
    float: right
    width: 50%
    max-width: 400px
    text-align: right
    button
      margin: 0 0 0 8px

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
    margin-top: 0

  .question-container
    background: $core-bg-light

  .question-navbutton-container
    text-align: right

</style>
