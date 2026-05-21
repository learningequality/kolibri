<template>

  <ResourceLayout>
    <template #default>
      <div
        class="content-wrapper"
        :style="{
          backgroundColor: $themeTokens.surface,
        }"
      >
        <KCircularLoader v-if="submitting" />
        <CourseInterstitial
          v-else-if="mastered"
          :title="completionTitle"
          :description="completionDescription"
        />
        <div v-else>
          <h1>
            {{ $tr('question', { num: questionNumber + 1, total: questionsTotal }) }}
          </h1>
          <ContentViewer
            v-if="itemId"
            ref="contentViewer"
            :lang="content.lang"
            :files="content.files"
            :extraFields="extraFields"
            :itemId="itemId"
            :assessment="true"
            :allowHints="false"
            :answerState="currentAttempt.answer"
            :userId="userId"
            :userFullName="userFullName"
            :timeSpent="timeSpent"
            @interaction="interactionHandler"
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
          <KModal
            v-if="submitModalOpen"
            :title="submitTestAction$()"
            :submitText="submitTestAction$()"
            :cancelText="coreString('goBackAction')"
            @submit="finishExam"
            @cancel="toggleModal"
          >
            <p>{{ $tr('areYouSure') }}</p>
            <p
              v-if="questionsUnanswered"
              class="alert"
              :style="{ backgroundColor: $themePalette.yellow.v_100 }"
            >
              <KIcon
                icon="warning"
                class="icon"
                :color="$themeTokens.warning"
              />
              <span>
                {{ $tr('unanswered', { numLeft: questionsUnanswered }) }}
              </span>
            </p>
          </KModal>
        </div>
      </div>
    </template>
    <template
      v-if="!mastered"
      #bottomBar
    >
      <div
        class="bottom-bar"
        :style="{
          background: $themeTokens.surface,
          borderTop: `1px solid ${$themeTokens.fineLine}`,
        }"
      >
        <div class="navigation-buttons-wrapper">
          <KButton
            :disabled="questionNumber === questionsTotal - 1"
            :primary="true"
            :aria-label="$tr('nextQuestion')"
            :appearanceOverrides="navigationButtonStyle"
            @click="goToQuestion(questionNumber + 1)"
          >
            <div class="btn-flex">
              <span v-if="displayNavigationButtonLabel">{{ $tr('nextQuestion') }}</span>
              <KIcon
                icon="forward"
                color="white"
                class="icon"
              />
            </div>
          </KButton>
          <KButton
            :disabled="questionNumber === 0"
            :primary="true"
            :appearanceOverrides="navigationButtonStyle"
            :aria-label="$tr('previousQuestion')"
            @click="goToQuestion(questionNumber - 1)"
          >
            <div class="btn-flex">
              <KIcon
                icon="back"
                color="white"
                class="icon"
              />
              <span v-if="displayNavigationButtonLabel">{{ $tr('previousQuestion') }}</span>
            </div>
          </KButton>
        </div>

        <!-- below prev/next buttons in tab and DOM order, in footer -->
        <div class="submit-info-wrapper">
          <div class="answered">
            {{ answeredText }}
          </div>
          <KButton
            :text="submitTestAction$()"
            :primary="false"
            appearance="flat-button"
            class="submit-button"
            @click="toggleModal"
          />
        </div>
      </div>
    </template>
    <template
      v-if="!mastered"
      #sidePanel
    >
      <nav
        :id="answerHistoryWrapperId"
        class="answer-history-wrapper"
      >
        <AnswerHistory
          :style="{ margin: 0 }"
          :pastattempts="pastattempts"
          :questionNumber="questionNumber"
          :overflowableParentId="answerHistoryWrapperId"
          :questions="itemIdArray"
          :currentQuestionAnswered="currentQuestionAnswered"
          @goToQuestion="goToQuestion"
        />
      </nav>
    </template>
  </ResourceLayout>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import get from 'lodash/get';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { LearnerClassroomResource } from '../../../apiResources';
  import ResourceLayout from '../../ResourceLayout/index.vue';
  import CourseInterstitial from '../../CourseUnitView/CourseInterstitial.vue';
  import { PRE_POST_TEST_CRITERION, TestType } from '../../../constants';
  import AnswerHistory from './AnswerHistory';

  let _uid = 0;

  export default {
    name: 'PrePostTestRenderer',
    components: {
      AnswerHistory,
      CourseInterstitial,
      UiAlert,
      ResourceLayout,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      const answerHistoryWrapperId = `answer-history-wrapper-${_uid++}`;
      const { submitTestAction$ } = coursesStrings;

      return {
        answerHistoryWrapperId,
        windowBreakpoint,
        submitTestAction$,
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
      masteryCriterion: {
        type: Object,
        required: true,
      },
      // TODO: is this a sustainable way to pass this?
      updateContentSession: {
        type: Function,
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
        currentQuestionAnswered: false,
      };
    },
    computed: {
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
      testType() {
        const masteryType = this.masteryCriterion.type;
        if (masteryType !== PRE_POST_TEST_CRITERION) {
          return null;
        }
        return this.masteryCriterion.test_type;
      },
      completionTitle() {
        const { preTestCompleted$, postTestCompleted$ } = coursesStrings;
        if (this.testType === TestType.PRE) {
          return preTestCompleted$();
        }
        if (this.testType === TestType.POST) {
          return postTestCompleted$();
        }
        return '';
      },
      completionDescription() {
        const { preTestCompletedDescription$, postTestCompletedDescription$ } = coursesStrings;
        if (this.testType === TestType.PRE) {
          return preTestCompletedDescription$();
        }
        if (this.testType === TestType.POST) {
          return postTestCompletedDescription$();
        }
        return '';
      },
      itemIdArray() {
        const masteryType = this.masteryCriterion.type;
        if (masteryType !== PRE_POST_TEST_CRITERION) {
          return [];
        }
        const preposttestVersion = this.masteryCriterion.version;
        const preposttestAssesments = get(
          this.content,
          'options.completion_criteria.threshold.pre_post_test',
        );

        let assessmentItemIds = [];
        if (preposttestVersion === 'A') {
          assessmentItemIds = preposttestAssesments?.version_a_item_ids || [];
        }
        if (preposttestVersion === 'B') {
          assessmentItemIds = preposttestAssesments?.version_b_item_ids || [];
        }

        const seed = this.userId ? this.userId + this.masteryLevel : Date.now();
        return shuffled(assessmentItemIds, seed);
      },
      itemId() {
        return this.itemIdArray[this.questionNumber];
      },
      questionsAnswered() {
        const answeredAttemptItems = this.pastattempts.reduce((map, attempt) => {
          if (attempt.answer) {
            map[attempt.item] = true;
          }
          return map;
        }, {});
        if (!answeredAttemptItems[this.itemId] && this.currentQuestionAnswered) {
          answeredAttemptItems[this.itemId] = true;
        }
        return Object.keys(answeredAttemptItems).length;
      },
      questionsUnanswered() {
        return this.questionsTotal - this.questionsAnswered;
      },
      questionsTotal() {
        return this.itemIdArray.length;
      },
      displayNavigationButtonLabel() {
        return this.windowBreakpoint > 0;
      },
      navigationButtonStyle() {
        return this.displayNavigationButtonLabel
          ? {}
          : { minWidth: '36px', width: '36px', padding: 0 };
      },
    },
    watch: {
      itemId(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.startTime = Date.now();
          this.currentQuestionAnswered = false;
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
        }

        return this.updateContentSession(data).then(() => {
          if (close) {
            this.stopTracking();
            this.submitting = false;
          }
        });
      },
      checkAnswer() {
        if (this.$refs.contentViewer) {
          return this.$refs.contentViewer.checkAnswer();
        }
        return null;
      },
      interactionHandler() {
        const answer = this.checkAnswer();
        if (answer) {
          this.currentQuestionAnswered = true;
        }
      },
      saveAnswer(close = false) {
        const answer = this.checkAnswer();
        if (
          this.currentQuestionAnswered &&
          answer &&
          !isEqual(answer.answerState, this.currentAttempt.answer)
        ) {
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
          return this.setAndSaveCurrentExamAttemptLog({ close, interaction });
        } else if (close) {
          return this.setAndSaveCurrentExamAttemptLog({ close });
        }
        return Promise.resolve();
      },
      goToQuestion(questionNumber) {
        this.saveAnswer();
        this.questionNumber = questionNumber;
      },
      toggleModal() {
        // Flush any existing save event to ensure
        // that the submit modal contains the latest state
        if (!this.submitModalOpen) {
          this.saveAnswer();
        }
        this.submitModalOpen = !this.submitModalOpen;
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
    },
    $trs: {
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

  .bottom-bar {
    display: flex;
    // Using row-reverse to make the navigation buttons come first in the DOM order for better
    // accessibility, but still have it appear on the right side visually.
    flex-direction: row-reverse;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
  }

  .navigation-buttons-wrapper {
    display: flex;
    // Using row-reverse to make the "next" button come first in the DOM order for better
    // accessibility, but still have it appear on the right side visually.
    flex-direction: row-reverse;
    flex-grow: 1;
    gap: 16px;
    justify-content: space-between;
  }

  .submit-info-wrapper {
    display: flex;
    // Adding a very big flex-grow here to push the navigation buttons to the right, and
    // avoid the navigation-buttons-wrapper to grow if they are on the same row. This is needed
    // because that node has a `justify-content: space-between` but we just want this style to
    // apply when the navigation buttons are on a different row (wrapped into a new line).
    flex-grow: 999;
    gap: 16px;
    align-items: center;

    .submit-button {
      flex-shrink: 0;
    }
  }

  .content-wrapper {
    height: 100%;
    padding: 24px;
    overflow: auto;
  }

  .column-pane {
    height: 100%;
    overflow-y: auto;
  }

  .answer-history-wrapper {
    height: 100%;
    padding: 8px;
    overflow-y: auto;
  }

  .bottom-block {
    margin-top: 8px;
  }

  .bottom-block.window-is-small {
    text-align: center;
  }

  .btn-flex {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;

    .icon {
      top: 0;
    }
  }

  .alert {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 4px;

    .icon {
      top: 0;
    }
  }

</style>
