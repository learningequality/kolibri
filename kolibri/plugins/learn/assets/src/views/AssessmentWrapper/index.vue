<template v-if="ready">

  <div>
    <LessonMasteryBar :requiredCorrectAnswers="totalCorrectRequiredM">
      <template #hint>
        <div
          v-if="totalHints > 0"
          class="hint-btn-container"
          :class="{ rtl: isRtl }"
        >
          <KButton
            v-if="availableHints > 0"
            class="hint-btn"
            appearance="basic-link"
            :text="hint$tr('hint', { hintsLeft: availableHints })"
            :primary="false"
            @click="takeHint"
          />
          <KButton
            v-else
            class="hint-btn"
            appearance="basic-link"
            :text="hint$tr('noMoreHint')"
            :primary="false"
            :disabled="true"
          />
          <CoreInfoIcon
            class="info-icon"
            tooltipPlacement="bottom left"
            :iconAriaLabel="hint$tr('hintExplanation')"
            :tooltipText="hint$tr('hintExplanation')"
          />
        </div>
      </template>
    </LessonMasteryBar>
    <div class="content-attempts-wrapper">
      <UiAlert
        v-if="itemError"
        :dismissible="false"
        type="error"
      >
        {{ $tr('itemError') }}
        <KButton
          appearance="basic-link"
          :text="$tr('tryDifferentQuestion')"
          @click="nextQuestion"
        />
      </UiAlert>
      <div
        class="content-wrapper"
        :style="{ backgroundColor: $themePalette.grey.v_100 }"
      >
        <ContentRenderer
          ref="contentRenderer"
          :kind="kind"
          :lang="lang"
          :files="files"
          :available="available"
          :extraFields="extraFields"
          :assessment="true"
          :itemId="itemId"
          :progress="progress"
          :userId="userId"
          :userFullName="userFullName"
          :timeSpent="timeSpent"
          @answerGiven="answerGiven"
          @hintTaken="hintTaken"
          @itemError="handleItemError"
          @startTracking="startTracking"
          @stopTracking="stopTracking"
          @updateProgress="updateProgress"
          @updateContentState="updateContentState"
          @error="err => $emit('error', err)"
        />
      </div>

      <BottomAppBar
        class="attempts-container"
        :class="{ mobile: windowIsSmall }"
      >
        <div
          class="overall-status"
          :style="{ color: $themeTokens.text }"
        >
          <KIcon
            icon="mastered"
            :color="success ? $themeTokens.mastered : $themePalette.grey.v_300"
          />
          <div class="overall-status-text">
            <span
              v-if="success"
              class="completed"
              :style="{ color: $themeTokens.annotation }"
            >
              {{ coreString('completedLabel') }}
            </span>
            <span>
              {{ $tr('goal', { count: totalCorrectRequiredM }) }}
            </span>
          </div>
        </div>
        <div class="table">
          <div class="row">
            <div class="left">
              <transition mode="out-in">
                <KButton
                  v-if="!complete"
                  appearance="raised-button"
                  :text="$tr('check')"
                  :primary="true"
                  :class="{ shaking: shake }"
                  :disabled="checkingAnswer"
                  @click="checkAnswer"
                />
                <KButton
                  v-else
                  ref="nextButton"
                  appearance="raised-button"
                  :text="$tr('next')"
                  :primary="true"
                  @click="nextQuestion"
                />
              </transition>
            </div>

            <div class="right">
              <ExerciseAttempts
                :waitingForAttempt="firstAttemptAtQuestion || itemError"
                :numSpaces="attemptsWindowN"
                :log="recentAttempts"
              />
              <p class="current-status">
                {{ currentStatus }}
              </p>
            </div>
          </div>
        </div>
      </BottomAppBar>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { MasteryModelGenerators } from 'kolibri/constants';
  import shuffled from 'kolibri-common/utils/shuffled';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import CoreInfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import { createTranslator, defaultLanguage } from 'kolibri/utils/i18n';
  import useUser from 'kolibri/composables/useUser';
  import LessonMasteryBar from './LessonMasteryBar';
  import ExerciseAttempts from './ExerciseAttempts';

  const hintTranslator = createTranslator('PerseusRendererIndex', {
    hint: {
      message: 'Use a hint ({hintsLeft, number} left)',
      context:
        'A hint is a suggestion to help learners solve a problem. This phrase tells the learner how many hints they have left to use.',
    },
    hintExplanation: {
      message: 'If you use a hint, this question will not be added to your progress',
      context: 'A hint is a suggestion to help learners solve a problem.',
    },
    noMoreHint: {
      message: 'No more hints',
      context: 'A hint is a suggestion to help learners solve a problem.',
    },
  });

  export default {
    name: 'AssessmentWrapper',
    components: {
      ExerciseAttempts,
      UiAlert,
      BottomAppBar,
      LessonMasteryBar,
      CoreInfoIcon,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const { currentUserId } = useUser();
      return {
        windowIsSmall,
        currentUserId,
      };
    },
    props: {
      lang: {
        type: Object,
        default: () => defaultLanguage,
      },
      kind: {
        type: String,
        required: true,
      },
      files: {
        type: Array,
        default: () => [],
      },
      available: {
        type: Boolean,
        default: false,
      },
      assessmentIds: {
        type: Array,
        required: true,
      },
      randomize: {
        type: Boolean,
        required: true,
      },
      masteryModel: {
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
      totalattempts: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        mounted: false,
        itemId: '',
        shake: false,
        firstAttemptAtQuestion: true,
        complete: false,
        correct: 0,
        itemError: false,
        hintWasTaken: false,
        // Attempted fix for #1725
        checkingAnswer: false,
        checkWasAttempted: false,
        startTime: null,
      };
    },
    computed: {
      currentattempt() {
        return !this.firstAttemptAtQuestion ? this.pastattempts[0] : null;
      },
      recentAttempts() {
        return this.pastattempts
          .map((attempt, index) => {
            // if first item and not a current attempt
            if (index === 0 && !this.firstAttemptAtQuestion) {
              if (attempt.correct === 1) {
                // first attempt was correct
                return 'right';
              } else if (this.correct === 1 && this.complete === true) {
                // correct but not in first attempt
                return 'rectified';
              } else if (this.correct === 0 && this.hintWasTaken) {
                // not correct and hint
                return 'hint';
              } else {
                // not correct and no hint
                return 'wrong';
              }
            } else {
              return attempt.correct === 1 ? 'right' : 'rectified';
            }
          })
          .reverse();
      },
      mOfNMasteryModel() {
        return MasteryModelGenerators[this.masteryModel.type](
          this.assessmentIds,
          this.masteryModel,
        );
      },
      totalCorrectRequiredM() {
        return this.mOfNMasteryModel.m;
      },
      attemptsWindowN() {
        return this.mOfNMasteryModel.n;
      },
      success() {
        return this.mastered;
      },
      currentStatus() {
        if (this.itemError) {
          return this.$tr('tryNextQuestion');
        } else if (this.firstAttemptAtQuestion && this.checkWasAttempted) {
          return this.$tr('inputAnswer');
        } else if (
          this.correct === 1 &&
          this.recentAttempts[this.recentAttempts.length - 1] === 'right'
        ) {
          return this.$tr('correct');
        } else if (this.correct === 1 && this.complete === true) {
          // rectified
          return this.$tr('greatKeepGoing');
        } else if (this.correct === 0 && this.hintWasTaken) {
          return this.$tr('hintUsed');
        } else if (this.checkWasAttempted) {
          return this.$tr('tryAgain');
        }
        return null;
      },
      renderer() {
        return this.mounted && this.$refs.contentRenderer;
      },
      availableHints() {
        return (this.renderer && this.renderer.availableHints) || 0;
      },
      totalHints() {
        return (this.renderer && this.renderer.totalHints) || 0;
      },
    },
    watch: {
      success(newValue, oldValue) {
        if (newValue && !oldValue) {
          this.$emit('finished');
        }
      },
    },
    created() {
      this.nextQuestion();
    },
    methods: {
      takeHint() {
        this.renderer && this.renderer.takeHint();
      },
      exerciseProgress(submittingAttempt) {
        if (this.mastered) {
          return 1;
        }
        const pastAttempts = submittingAttempt
          ? [submittingAttempt].concat(this.pastattempts)
          : this.pastattempts;
        if (pastAttempts.length) {
          let calculatedMastery;
          if (pastAttempts.length > this.attemptsWindowN) {
            calculatedMastery = Math.min(
              pastAttempts.slice(0, this.attemptsWindowN).reduce((a, b) => a + b.correct, 0) /
                this.totalCorrectRequiredM,
              1,
            );
          } else {
            calculatedMastery = Math.min(
              pastAttempts.reduce((a, b) => a + b.correct, 0) / this.totalCorrectRequiredM,
              1,
            );
          }
          // If there are any attempts at all, set some progress on the exercise
          // because they have now started the exercise.
          return Math.max(calculatedMastery, 0.001);
        }
        return 0;
      },
      checkAnswer() {
        this.checkWasAttempted = true;
        if (!this.checkingAnswer) {
          this.checkingAnswer = true;
          const answer = this.$refs.contentRenderer.checkAnswer();
          if (answer) {
            this.answerGiven(answer);
          }
          this.checkingAnswer = false;
        }
      },
      answerGiven({ correct, answerState, simpleAnswer }) {
        this.hintWasTaken = false;
        correct = Number(correct);
        this.correct = correct;
        if (correct < 1) {
          if (!this.shake) {
            setTimeout(() => {
              this.shake = false;
            }, 1000);
            this.shake = true;
          }
        }
        this.complete = correct === 1;
        this.updateAttempt({ answerState, simpleAnswer });
        if (this.complete) {
          this.$nextTick(() => {
            this.$refs.nextButton.$el.focus();
          });
        }
      },
      hintTaken({ answerState }) {
        this.hintWasTaken = true;
        this.updateAttempt({ answerState });
      },
      updateAttempt({ answerState, simpleAnswer } = {}) {
        const interaction = {
          complete: this.complete,
          time_spent: (new Date() - this.startTime) / 1000,
          correct: this.correct,
          hinted: this.hintWasTaken,
          error: this.itemError,
          item: this.itemId,
        };
        if (answerState) {
          interaction.answer = answerState;
        }
        if (simpleAnswer) {
          interaction.simple_answer = simpleAnswer;
        }
        let progress;
        if (this.firstAttemptAtQuestion) {
          // Only update progress on first attempt at question
          // as cannot change progress on subsequent attempts.
          progress = this.exerciseProgress(interaction);
          this.firstAttemptAtQuestion = false;
        } else {
          interaction.id = this.currentattempt.id;
        }
        this.updateInteraction({ progress, interaction });
      },
      setItemId() {
        const index = this.totalattempts % this.assessmentIds.length;
        if (this.randomize) {
          const seed = this.currentUserId ? this.currentUserId : Date.now();
          this.itemId = shuffled(this.assessmentIds, seed)[index];
        } else {
          this.itemId = this.assessmentIds[index];
        }
      },
      nextQuestion() {
        this.complete = false;
        this.shake = false;
        this.firstAttemptAtQuestion = true;
        this.correct = 0;
        this.itemError = false;
        this.checkWasAttempted = false;
        this.startTime = new Date();
        this.hintWasTaken = false;
        this.setItemId();
      },
      handleItemError() {
        this.itemError = true;
        this.complete = true;
        this.updateAttempt();
      },
      updateInteraction(...args) {
        this.$emit('updateInteraction', ...args);
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
      hint$tr(msgId, options) {
        return hintTranslator.$tr(msgId, options);
      },
    },
    $trs: {
      goal: {
        message: 'Get {count, number, integer} {count, plural, other {correct}}',
        context:
          'Message that indicates to the learner how many correct answers they need to give in order to master the given topic, and for the exercise to be considered completed.',
      },
      tryAgain: {
        message: 'Try again',
        context:
          "If a learner answers a question incorrectly, the message 'Try again' displays. They can then attempt to answer again.",
      },
      correct: {
        message: 'Correct!',
        context: "An answer that the learner got right will be marked as 'Correct!'.",
      },
      check: {
        message: 'Check',
        context:
          "Learners use the 'CHECK' button when doing an exercise to check if they have answered a question correctly or not.",
      },
      next: {
        message: 'Next',
        context: 'Button that takes user to next question.',
      },
      itemError: {
        message: 'There was an error showing this question',
        context:
          'Error message a user sees if there was a problem accessing a learning resource. This may be because the resource has been removed, for example.',
      },
      inputAnswer: {
        message: 'Please enter an answer above',
        context:
          'Message that a learner sees if they try to check their answer without answering the question.',
      },
      hintUsed: {
        message: 'Hint used',
        context:
          "Some exercises can offer hints. These can be suggestions to help learners solve a problem.\n\nIf the learner uses a hint, the text 'Hint used' appears in the exercise.",
      },
      greatKeepGoing: {
        message: 'Great! Keep going',
        context:
          'Message of encouragement that learner is shown when they answer a question incorrectly but then on a further attempt they get it correct.',
      },
      tryDifferentQuestion: {
        message: 'Try a different question',
        context:
          'Message that displays if learner answers a question incorrectly multiple times. It allows them to try a new question.',
      },
      tryNextQuestion: {
        message: 'Try next question',
        context:
          'Message that displays if learner answers a question incorrectly multiple times. It allows them to move on to the next question.\n',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .content-attempts-wrapper {
    // Make the wrapper for the content and attempts the full height of the parent
    // minus the height of the mastery bar above: 56px.
    height: calc(100% - 56px);
  }

  .content-wrapper {
    // Make the content wrapper the full height of the parent content attempts wrapper
    // minus the height of the attempts container below: 111px.
    height: calc(100% - 111px);
  }

  .attempts-container {
    height: 111px;
    text-align: left;
  }

  .overall-status {
    margin-bottom: 8px;
    margin-left: 12px;
  }

  .overall-status-text {
    display: inline-block;
    margin-left: 4px;
  }

  .completed {
    font-size: 12px;
  }

  .table {
    display: table;
    padding-left: 12px;
  }

  .row {
    display: table-row;
  }

  .left,
  .right {
    display: table-cell;
    vertical-align: top;
  }

  .right {
    width: 99%;
    padding-left: 8px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  // checkAnswer btn animation
  .shaking {
    @extend %enable-gpu-acceleration;

    animation: shake 0.8s ease-in-out both;
  }

  @keyframes shake {
    10%,
    90% {
      transform: translate3d(-1px, 0, 0);
    }

    20%,
    80% {
      transform: translate3d(2px, 0, 0);
    }

    30%,
    50%,
    70% {
      transform: translate3d(-4px, 0, 0);
    }

    40%,
    60% {
      transform: translate3d(4px, 0, 0);
    }
  }

  .current-status {
    height: 18px;
    margin: 0;
  }

  .hint-btn-container {
    display: flex;
    align-items: center;
    font-size: medium;

    // Ensures the tooltip is visible on the screen in RTL and LTR
    /deep/ &.rtl {
      /deep/ .k-tooltip {
        right: auto !important;
        left: 0 !important;
      }
    }

    /deep/ .k-tooltip {
      right: 0 !important;
      left: auto !important;
      transform: translate3d(0, 23px, 0) !important;
    }
  }

  .hint-btn {
    padding: 0 4px; // Space from btn in RTL and LTR
    vertical-align: text-bottom;

    /deep/ .link-text {
      text-align: right;
    }
  }

</style>
