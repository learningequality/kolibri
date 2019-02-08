<template>

  <ImmersiveFullScreen
    v-if="exam"
    :backPageLink="backPageLink"
    :backPageText="$tr('backToExamList')"
  >
    <MultiPaneLayout ref="multiPaneLayout">
      <div slot="header" class="exam-status-container" :style="{ backgroundColor: $coreBgLight }">
        <mat-svg
          slot="content-icon"
          class="exam-icon"
          :style="{ fill: $coreTextDefault }"
          category="action"
          name="assignment_late"
        />
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
          <KButton :text="$tr('submitExam')" :primary="true" @click="toggleModal" />
        </div>
        <div :style="{ clear: 'both' }"></div>
      </div>

      <AnswerHistory
        slot="aside"
        :questionNumber="questionNumber"
        @goToQuestion="goToQuestion"
      />

      <div
        slot="main"
        :style="{ background: $coreBgLight }"
      >
        <ContentRenderer
          v-if="itemId"
          :id="content.id"
          ref="contentRenderer"
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
        <UiAlert v-else :dismissible="false" type="error">
          {{ $tr('noItemId') }}
        </UiAlert>
      </div>

      <div slot="footer" class="question-navbutton-container">
        <KButton
          :disabled="questionNumber===0"
          :text="$tr('previousQuestion')"
          @click="goToQuestion(questionNumber - 1)"
        />
        <KButton
          :disabled="questionNumber===exam.question_count-1"
          :text="$tr('nextQuestion')"
          @click="goToQuestion(questionNumber + 1)"
        />
      </div>
    </MultiPaneLayout>

    <KModal
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
    </KModal>
  </ImmersiveFullScreen>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { InteractionTypes } from 'kolibri.coreVue.vuex.constants';
  import isEqual from 'lodash/isEqual';
  import { now } from 'kolibri.utils.serverClock';
  import debounce from 'lodash/debounce';
  import ImmersiveFullScreen from 'kolibri.coreVue.components.ImmersiveFullScreen';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KModal from 'kolibri.coreVue.components.KModal';
  import UiAlert from 'kolibri.coreVue.components.UiAlert';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import { ClassesPageNames } from '../../constants';
  import AnswerHistory from './AnswerHistory';

  export default {
    name: 'ExamPage',
    $trs: {
      submitExam: 'Submit quiz',
      backToExamList: 'Back to quiz list',
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
      AnswerHistory,
      KModal,
      UiAlert,
      MultiPaneLayout,
    },
    mixins: [themeMixin],
    data() {
      return {
        submitModalOpen: false,
      };
    },
    computed: {
      ...mapState(['examAttemptLogs']),
      ...mapState('examViewer', [
        'channelId',
        'exam',
        'content',
        'itemId',
        'questionNumber',
        'currentAttempt',
        'questionsAnswered',
      ]),
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
    watch: {
      itemId(newVal, oldVal) {
        // HACK: manually dismiss the perseus renderer message when moving
        // to a different item (fixes #3853)
        if (newVal !== oldVal) {
          this.$refs.contentRenderer.$refs.contentView.dismissMessage();
        }
      },
    },
    methods: {
      ...mapActions('examViewer', ['setAndSaveCurrentExamAttemptLog', 'closeExam']),
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
          const saveData = {
            contentId: this.content.id,
            itemId: this.itemId,
            currentAttemptLog: attempt,
            examId: this.exam.id,
          };
          if (force) {
            // Cancel any pending debounce
            this.debouncedSetAndSaveCurrentExamAttemptLog.cancel();
            // Force the save now instead
            return this.setAndSaveCurrentExamAttemptLog(saveData);
          } else {
            return this.debouncedSetAndSaveCurrentExamAttemptLog(saveData);
          }
        }
        return Promise.resolve();
      },
      goToQuestion(questionNumber) {
        const promise = this.debouncedSetAndSaveCurrentExamAttemptLog.flush() || Promise.resolve();
        promise.then(() => {
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
        // Flush any existing save event to ensure
        // that the subit modal contains the latest state
        if (!this.submitModalOpen) {
          const promise =
            this.debouncedSetAndSaveCurrentExamAttemptLog.flush() || Promise.resolve();
          return promise.then(() => {
            this.submitModalOpen = !this.submitModalOpen;
          });
        }
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

  .exam-status-container {
    padding: 16px;
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
  }

  .exam-title {
    display: inline-block;
  }

  .questions-answered {
    position: relative;
    display: inline-block;
    margin-top: 0;
  }

  .question-navbutton-container {
    text-align: right;
  }

</style>
