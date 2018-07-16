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
        <div :style="{ clear: 'both' }"></div>
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
          @interaction="saveAnswer"
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

    <k-modal
      v-if="submitModalOpen"
      :title="$tr('submitExam')"
      :submitText="$tr('submitExam')"
      :cancelText="$tr('goBack')"
      @submit="finishExam"
      @cancel="toggleModal"
    >
      <p>{{ $tr('areYouSure') }}</p>
      <p v-if="questionsUnanswered">
        {{ $tr('unanswered', { numLeft: questionsUnanswered } ) }}
      </p>
    </k-modal>
  </immersive-full-screen>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { InteractionTypes } from 'kolibri.coreVue.vuex.constants';
  import isEqual from 'lodash/isEqual';
  import { now } from 'kolibri.utils.serverClock';
  import debounce from 'lodash/debounce';
  import ImmersiveFullScreen from 'kolibri.coreVue.components.ImmersiveFullScreen';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KModal from 'kolibri.coreVue.components.KModal';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import { ClassesPageNames } from '../../constants';
  import answerHistory from './answer-history';

  export default {
    name: 'ExamPage',
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
    metaInfo() {
      return {
        title: this.exam.title,
      };
    },
    components: {
      ImmersiveFullScreen,
      ContentRenderer,
      KButton,
      answerHistory,
      KModal,
      uiAlert,
      MultiPaneLayout,
    },
    data() {
      return {
        submitModalOpen: false,
      };
    },
    computed: {
      ...mapState(['examAttemptLogs']),
      ...mapState({
        channelId: state => state.pageState.channelId,
        exam: state => state.pageState.exam,
        content: state => state.pageState.content,
        itemId: state => state.pageState.itemId,
        questionNumber: state => state.pageState.questionNumber,
        currentAttempt: state => state.pageState.currentAttempt,
        questionsAnswered: state => state.pageState.questionsAnswered,
      }),
      backPageLink() {
        return {
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
        };
      },
      questionsUnanswered() {
        return this.exam.question_count - this.questionsAnswered;
      },
      debouncedSetAndSaveCurrentExamAttemptLog() {
        // So as not to share debounced functions between instances of the same component
        // and also to allow access to the cancel method of the debounced function
        // best practice seems to be to do it as a computed property and not a method:
        // https://github.com/vuejs/vue/issues/2870#issuecomment-219096773
        return debounce(this.setAndSaveCurrentExamAttemptLog, 5000);
      },
    },
    methods: {
      ...mapActions(['setAndSaveCurrentExamAttemptLog', 'closeExam']),
      checkAnswer() {
        if (this.$refs.contentRenderer) {
          return this.$refs.contentRenderer.checkAnswer();
        }
        return null;
      },
      saveAnswer(force = false) {
        const answer = this.checkAnswer();
        if (answer && !isEqual(answer.answerState, this.currentAttempt.answer)) {
          const attempt = Object.assign({}, this.currentAttempt);
          // Copy the interaction history separately, as otherwise we
          // will still be modifying the underlying object
          attempt.interaction_history = Array(...attempt.interaction_history);
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
          if (force) {
            // Cancel any pending debounce
            this.debouncedSetAndSaveCurrentExamAttemptLog.cancel();
            // Force the save now instead
            return this.setAndSaveCurrentExamAttemptLog({
              contentId: this.content.id,
              itemId: this.itemId,
              currentAttemptLog: attempt,
              examId: this.exam.id,
            });
          } else {
            return this.debouncedSetAndSaveCurrentExamAttemptLog({
              contentId: this.content.id,
              itemId: this.itemId,
              currentAttemptLog: attempt,
              examId: this.exam.id,
            });
          }
        }
        return Promise.resolve();
      },
      goToQuestion(questionNumber) {
        this.saveAnswer(true).then(() => {
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
        this.saveAnswer(true).then(
          this.closeExam().then(() => {
            this.$router.push(this.backPageLink);
          })
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .exam-status-container {
    padding: 16px;
    background: $core-bg-light;
  }

  .exam-status {
    float: right;
    width: 50%;
    max-width: 400px;
    text-align: right;
    button {
      margin: 0 0 0 8px;
    }
  }

  .exam-icon {
    position: relative;
    top: 4px;
    margin-right: 5px;
    fill: $core-text-default;
  }

  .exam-title {
    display: inline-block;
  }

  .questions-answered {
    position: relative;
    display: inline-block;
    margin-top: 0;
  }

  .question-container {
    background: $core-bg-light;
  }

  .question-navbutton-container {
    text-align: right;
  }

</style>
