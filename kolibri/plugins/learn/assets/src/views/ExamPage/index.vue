<template>

  <KPageContainer noPadding>
    <MultiPaneLayout ref="multiPaneLayout">
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
          v-if="content && itemId"
          ref="contentRenderer"
          :kind="content.kind"
          :files="content.files"
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

    </MultiPaneLayout>
    <KBottomAppBar>
      <KGrid>
        <KGridItem sizes="50, 50, 25" percentage alignment="left">
          <KButton
            :disabled="questionNumber===0"
            :text="$tr('previousQuestion')"
            :primary="true"
            @click="goToQuestion(questionNumber - 1)"
          />
        </KGridItem>
        <KGridItem v-if="windowIsLarge" size="50" percentage alignment="center">
          <div class="answered">
            {{
              $tr(
                'questionsAnswered',
                { numAnswered: questionsAnswered, numTotal: exam.question_count }
              )
            }}
          </div>
          <KButton
            :text="$tr('submitExam')"
            :primary="false"
            appearance="flat-button"
            @click="toggleModal"
          />
        </KGridItem>
        <KGridItem sizes="50, 50, 25" percentage alignment="right">
          <KButton
            :disabled="questionNumber===exam.question_count-1"
            :text="$tr('nextQuestion')"
            :primary="true"
            @click="goToQuestion(questionNumber + 1)"
          />
        </KGridItem>
      </KGrid>
    </KBottomAppBar>

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
  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { InteractionTypes } from 'kolibri.coreVue.vuex.constants';
  import isEqual from 'lodash/isEqual';
  import { now } from 'kolibri.utils.serverClock';
  import debounce from 'lodash/debounce';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KBottomAppBar from 'kolibri.coreVue.components.KBottomAppBar';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KModal from 'kolibri.coreVue.components.KModal';
  import UiAlert from 'kolibri.coreVue.components.UiAlert';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { ClassesPageNames } from '../../constants';
  import AnswerHistory from './AnswerHistory';

  export default {
    name: 'ExamPage',
    metaInfo() {
      return {
        title: this.exam.title,
      };
    },
    components: {
      ContentRenderer,
      KButton,
      KPageContainer,
      AnswerHistory,
      KIcon,
      KLabeledIcon,
      KModal,
      UiAlert,
      MultiPaneLayout,
      KGrid,
      KGridItem,
      KBottomAppBar,
    },
    mixins: [themeMixin, responsiveWindow],
    data() {
      return {
        submitModalOpen: false,
      };
    },
    computed: {
      ...mapState('examViewer', [
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
    $trs: {
      submitExam: 'Submit quiz',
      backToExamList: 'Back to quiz list',
      questionsAnswered:
        '{numAnswered, number} of {numTotal, number} {numTotal, plural, one {question} other {questions}} answered',
      previousQuestion: 'Previous',
      nextQuestion: 'Next',
      goBack: 'Go back',
      areYouSure: 'You cannot change your answers after you submit',
      unanswered:
        'You have {numLeft, number} {numLeft, plural, one {question} other {questions}} unanswered',
      noItemId: 'This question has an error, please move on to the next question',
    },
  };

</script>


<style lang="scss" scoped>

  .answered {
    display: inline-block;
    margin-right: 18px;
  }

</style>
