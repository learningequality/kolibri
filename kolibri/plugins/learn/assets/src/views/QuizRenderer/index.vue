<template>

  <div>
    <KCircularLoader v-if="submitting" />
    <QuizReport
      v-else-if="mastered"
      :userId="userId"
      :userName="userFullName"
      :content="content"
      @repeat="repeat"
    />
    <KGrid
      v-else
      :gridStyle="gridStyle"
    >
      <!-- this.$refs.questionListWrapper is referenced inside AnswerHistory for scrolling -->
      <KGridItem
        v-if="windowIsLarge"
        ref="questionListWrapper"
        :layout12="{ span: 4 }"
        class="column-pane"
      >
        <div class="column-contents-wrapper">
          <KPageContainer>
            <AnswerHistory
              :pastattempts="pastattempts"
              :questionNumber="questionNumber"
              :wrapperComponentRefs="$refs"
              :questions="itemIdArray"
              @goToQuestion="goToQuestion"
            />
          </KPageContainer>
        </div>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 8 }"
        class="column-pane"
      >
        <div :class="{ 'column-contents-wrapper': !windowIsSmall }">
          <KPageContainer>
            <h1>
              {{ $tr('question', { num: questionNumber + 1, total: questionsTotal }) }}
            </h1>
            <ContentRenderer
              v-if="itemId"
              ref="contentRenderer"
              :kind="content.kind"
              :lang="content.lang"
              :files="content.files"
              :available="content.available"
              :extraFields="extraFields"
              :itemId="itemId"
              :assessment="true"
              :allowHints="false"
              :answerState="currentAttempt.answer"
              :progress="progress"
              :userId="userId"
              :userFullName="userFullName"
              :timeSpent="timeSpent"
              @interaction="saveAnswer"
              @updateProgress="updateProgress"
              @updateContentState="updateContentState"
              @error="err => $emit('error', err)"
            />
            <UiAlert
              v-else
              :dismissible="false"
              type="error"
            >
              {{ $tr('noItemId') }}
            </UiAlert>
          </KPageContainer>

          <BottomAppBar
            :dir="bottomBarLayoutDirection"
            :maxWidth="null"
          >
            <component :is="windowIsSmall ? 'div' : 'KButtonGroup'">
              <KButton
                :disabled="questionNumber === questionsTotal - 1"
                :primary="true"
                :dir="layoutDirReset"
                :aria-label="$tr('nextQuestion')"
                :appearanceOverrides="navigationButtonStyle"
                @click="goToQuestion(questionNumber + 1)"
              >
                <span v-if="displayNavigationButtonLabel">{{ $tr('nextQuestion') }}</span>
                <template #iconAfter>
                  <KIcon
                    icon="forward"
                    color="white"
                    :style="navigationIconStyleNext"
                  />
                </template>
              </KButton>
              <KButton
                :disabled="questionNumber === 0"
                :primary="true"
                :dir="layoutDirReset"
                :appearanceOverrides="navigationButtonStyle"
                :aria-label="$tr('previousQuestion')"
                :class="{ 'left-align': windowIsSmall }"
                @click="goToQuestion(questionNumber - 1)"
              >
                <template #icon>
                  <KIcon
                    icon="back"
                    color="white"
                    :style="navigationIconStylePrevious"
                  />
                </template>
                <span v-if="displayNavigationButtonLabel">{{ $tr('previousQuestion') }}</span>
              </KButton>
            </component>

            <!-- below prev/next buttons in tab and DOM order, in footer -->
            <div
              v-if="windowIsLarge"
              :dir="layoutDirReset"
              class="left-align"
            >
              <div class="answered">
                {{ answeredText }}
              </div>
              <KButton
                :text="isSurvey ? $tr('submitSurvey') : $tr('submitExam')"
                :primary="false"
                appearance="flat-button"
                @click="toggleModal"
              />
            </div>
          </BottomAppBar>

          <!-- below prev/next buttons in tab and DOM order, in page -->
          <KPageContainer v-if="!windowIsLarge">
            <div
              class="bottom-block"
              :class="{ 'window-is-small': windowIsSmall }"
            >
              <div class="answered">
                {{ answeredText }}
              </div>
              <KButton
                :text="isSurvey ? $tr('submitSurvey') : $tr('submitExam')"
                :primary="false"
                appearance="flat-button"
                @click="toggleModal"
              />
            </div>
          </KPageContainer>
        </div>
      </KGridItem>
    </KGrid>

    <KModal
      v-if="submitModalOpen"
      :title="isSurvey ? $tr('submitSurvey') : $tr('submitExam')"
      :submitText="isSurvey ? $tr('submitSurvey') : $tr('submitExam')"
      :cancelText="coreString('goBackAction')"
      @submit="finishExam"
      @cancel="toggleModal"
    >
      <p>{{ $tr('areYouSure') }}</p>
      <p v-if="questionsUnanswered">
        {{ $tr('unanswered', { numLeft: questionsUnanswered }) }}
      </p>
    </KModal>
  </div>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import debounce from 'lodash/debounce';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import UiIconButton from 'kolibri-design-system/lib/keen/UiIconButton';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { LearnerClassroomResource } from '../../apiResources';
  import AnswerHistory from './AnswerHistory';
  import QuizReport from './QuizReport';

  export default {
    name: 'QuizRenderer',
    components: {
      AnswerHistory,
      UiAlert,
      UiIconButton,
      BottomAppBar,
      QuizReport,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint, windowIsLarge, windowIsSmall } = useKResponsiveWindow();
      return {
        windowBreakpoint,
        windowIsLarge,
        windowIsSmall,
      };
    },
    props: {
      content: {
        type: Object,
        required: true,
      },
      extraFields: {
        type: Object,
        default: () => ({}),
      },
      // An explicit record of the current progress through this
      // piece of content.
      progress: {
        type: Number,
        default: 0,
      },
      // An identifier for the user interacting with this content
      userId: {
        type: String,
        default: null,
      },
      userFullName: {
        type: String,
        default: null,
      },
      timeSpent: {
        type: Number,
        default: null,
      },
      pastattempts: {
        type: Array,
        default: () => [],
      },
      mastered: {
        type: Boolean,
        default: false,
      },
      masteryLevel: {
        type: Number,
        default: 0,
      },
      // TODO: is this a sustainable way to pass this?
      updateContentSession: {
        type: Function,
        default: () => {},
      },
      isSurvey: {
        type: Boolean,
        default: () => {},
      },
    },
    data() {
      return {
        submitModalOpen: false,
        // Note this time is only used to calculate the time spent on a
        // question, it is not used to generate any timestamps.
        startTime: Date.now(),
        questionNumber: 0,
        submitting: false,
      };
    },
    computed: {
      gridStyle() {
        if (!this.windowIsSmall) {
          return {
            position: 'fixed',
            top: '64px',
            right: '16px',
            bottom: '72px',
            left: '16px',
          };
        }
        return {};
      },
      answeredText() {
        return this.$tr('questionsAnswered', {
          numAnswered: this.questionsAnswered,
          numTotal: this.questionsTotal,
        });
      },
      currentAttempt() {
        return (
          this.pastattempts.find(attempt => attempt.item === this.itemId) || {
            item: this.itemId,
            complete: false,
            time_spent: 0,
            correct: 0,
            answer: null,
            simple_answer: '',
            hinted: false,
          }
        );
      },
      itemIdArray() {
        if (this.content.assessmentmetadata.randomize) {
          // Differentiate the seed for each 'try' indicated by the masteryLevel.
          const seed = this.userid ? this.userid + this.masteryLevel : Date.now();
          return shuffled(this.content.assessmentmetadata.assessment_item_ids, seed);
        }
        return this.content.assessmentmetadata.assessment_item_ids;
      },
      itemId() {
        return this.itemIdArray[this.questionNumber];
      },
      questionsAnswered() {
        return Object.keys(
          this.pastattempts.reduce((map, attempt) => {
            if (attempt.answer) {
              map[attempt.item] = true;
            }
            return map;
          }, {}),
        ).length;
      },
      questionsUnanswered() {
        return this.questionsTotal - this.questionsAnswered;
      },
      questionsTotal() {
        return this.content.assessmentmetadata.assessment_item_ids.length;
      },
      debouncedSetAndSaveCurrentExamAttemptLog() {
        // So as not to share debounced functions between instances of the same component
        // and also to allow access to the cancel method of the debounced function
        // best practice seems to be to do it as a computed property and not a method:
        // https://github.com/vuejs/vue/issues/2870#issuecomment-219096773
        return debounce(this.setAndSaveCurrentExamAttemptLog, 500);
      },
      bottomBarLayoutDirection() {
        // Allows contents to be displayed visually in reverse-order,
        // but semantically in correct order.
        return this.isRtl ? 'ltr' : 'rtl';
      },
      layoutDirReset() {
        // Overrides bottomBarLayoutDirection reversal
        return this.isRtl ? 'rtl' : 'ltr';
      },
      displayNavigationButtonLabel() {
        return this.windowBreakpoint > 0;
      },
      navigationButtonStyle() {
        return this.displayNavigationButtonLabel
          ? {}
          : { minWidth: '36px', width: '36px', padding: 0 };
      },
      navigationIconStyleNext() {
        return this.displayNavigationButtonLabel
          ? { position: 'relative', top: '3px', left: '4px' }
          : {};
      },
      navigationIconStylePrevious() {
        return this.displayNavigationButtonLabel
          ? { position: 'relative', top: '3px', left: '-4px' }
          : {};
      },
    },
    watch: {
      itemId(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.startTime = Date.now();
        }
      },
      mastered(newVal, oldVal) {
        if (!newVal && oldVal) {
          // We were looking at a report before but now we are retaking
          // the quiz, so start tracking.
          this.startTracking();
        }
      },
    },
    created() {
      // Only start tracking if we're not currently on a completed try
      if (!this.mastered) {
        this.startTracking();
      }
    },
    methods: {
      setAndSaveCurrentExamAttemptLog({ close, interaction } = {}) {
        // Clear the learner classroom cache here as its progress data is now
        // stale
        LearnerClassroomResource.clearCache();

        const data = {};

        if (interaction) {
          data.interaction = { ...interaction, replace: true };
        }

        if (close) {
          data.progress = 1;
          data.force = true;
          data.immediate = true;
          this.submitting = true;
        } else {
          // We don't set progress to 1 until the quiz is submitted, so we max out here.
          // If any interaction has happened, we set a peppercorn progress so that it shows
          // as interacted with.
          data.progress = Math.max(
            0.001,
            Math.min(
              this.pastattempts.length / this.content.assessmentmetadata.assessment_item_ids.length,
              0.99,
            ),
          );
        }
        return this.updateContentSession(data).then(() => {
          if (close) {
            this.stopTracking();
            this.submitting = false;
          }
        });
      },
      checkAnswer() {
        if (this.$refs.contentRenderer) {
          return this.$refs.contentRenderer.checkAnswer();
        }
        return null;
      },
      saveAnswer(close = false) {
        const answer = this.checkAnswer();
        if (answer && !isEqual(answer.answerState, this.currentAttempt.answer)) {
          const interaction = {
            answer: answer.answerState,
            simple_answer: answer.simpleAnswer || '',
            correct: answer.correct,
            item: this.itemId,
            id: this.currentAttempt.id,
            time_spent:
              ((this.currentAttempt.time_spent || 0) + Date.now() - this.startTime) / 1000,
          };
          this.startTime = Date.now();
          if (close) {
            return this.setAndSaveCurrentExamAttemptLog({ close, interaction });
          }
          return this.debouncedSetAndSaveCurrentExamAttemptLog({ interaction });
        } else if (close) {
          return this.setAndSaveCurrentExamAttemptLog({ close });
        }
        return Promise.resolve();
      },
      goToQuestion(questionNumber) {
        this.questionNumber = questionNumber;
      },
      toggleModal() {
        // Flush any existing save event to ensure
        // that the subit modal contains the latest state
        Promise.resolve(
          this.submitModalOpen || this.debouncedSetAndSaveCurrentExamAttemptLog.flush(),
        ).then(() => {
          this.submitModalOpen = !this.submitModalOpen;
        });
      },
      finishExam() {
        this.saveAnswer(true).then(() => {
          this.submitModalOpen = false;
          this.$emit('finished');
        });
      },
      updateProgress(...args) {
        this.$emit('updateProgress', ...args);
      },
      updateContentState(...args) {
        this.$emit('updateContentState', ...args);
      },
      startTracking(...args) {
        this.mounted = true;
        this.$emit('startTracking', ...args);
      },
      stopTracking(...args) {
        this.$emit('stopTracking', ...args);
      },
      repeat() {
        this.$emit('repeat');
      },
    },
    $trs: {
      submitExam: {
        message: 'Submit quiz',
        context:
          'Action that learner takes to submit their quiz answers so that the coach can review them.',
      },
      submitSurvey: {
        message: 'Submit survey',
        context:
          'Action that learner takes to submit their exam answers so that they can be reviewed.',
      },
      questionsAnswered: {
        message:
          '{numAnswered, number} of {numTotal, number} {numTotal, plural, one {question answered} other {questions answered}}',
        context:
          'Indicates the number of questions a learner has answered. Only translate "of" and "question/questions answered".',
      },
      previousQuestion: {
        message: 'Previous',
        context: 'Button indicating the previous question in a quiz.',
      },
      nextQuestion: {
        message: 'Next',
        context: 'Button indicating the next question in a quiz.',
      },
      areYouSure: {
        message: 'You cannot change your answers after you submit',
        context:
          "Message a learner sees when they submit answers in an exercise to their coach. It serves as a way of checking that the user is aware that once they've submitted their answers, they cannot change them afterwards.",
      },
      unanswered: {
        message:
          'You have {numLeft, number} {numLeft, plural, one {question unanswered} other {questions unanswered}}',

        context: 'Indicates how many questions the learner has not answered.',
      },
      noItemId: {
        message: 'This question has an error, please move on to the next question',
        context:
          'Message they may appear to the learner if there is a question missing in a quiz. The question may have been deleted accidentally, for example.',
      },
      question: {
        message: 'Question {num, number, integer} of {total, number, integer}',
        context:
          'Indicates which question the user is working on currently and the total number of questions in a quiz.\n\nFor example: "Question 2 of 10".',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .answered {
    display: inline-block;
    margin-right: 8px;
    margin-left: 8px;
    white-space: nowrap;
  }

  .column-pane {
    height: 100%;
    padding-bottom: 32px;
    overflow-y: auto;
  }

  .column-contents-wrapper {
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .bottom-block {
    margin-top: 8px;
  }

  .bottom-block.window-is-small {
    text-align: center;
  }

  .left-align {
    position: absolute;
    left: 16px;
    display: inline-block;
  }

</style>
