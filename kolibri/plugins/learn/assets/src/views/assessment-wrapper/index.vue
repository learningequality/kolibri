<!--
This template is intended to act as the default wrapper for assessment focused rendering
plugins.

As such, it provides display of current mastery progress, and manages all mastery/attempt log
oriented data synchronization.
-->


<template v-if="ready">

  <div>
    <ui-alert v-if="itemError" :dismissible="false" type="error">
      {{ $tr('itemError') }}
    </ui-alert>
    <div>
      <content-renderer
        ref="contentRenderer"
        class="content-renderer"
        :id="content.id"
        :kind="content.kind"
        :files="content.files"
        :contentId="content.content_id"
        :channelId="channelId"
        :available="content.available"
        :extraFields="content.extra_fields"
        :assessment="true"
        :itemId="itemId"
        :initSession="initSession"
        @answerGiven="answerGiven"
        @hintTaken="hintTaken"
        @sessionInitialized="sessionInitialized"
        @itemError="handleItemError"
        @startTracking="startTracking"
        @stopTracking="stopTracking"
        @updateProgress="updateProgress" />
    </div>

    <div>
      <transition mode="out-in">
        <k-button
          :text="$tr('check')"
          :primary="checkButtonIsPrimary"
          appearance="raised-button"
          v-if="!complete"
          @click="checkAnswer"
          class="question-btn"
          :class="{shaking: shake}"
          :disabled="checkingAnswer"
        />
        <k-button
          :text="$tr('next')"
          :primary="true"
          appearance="raised-button"
          v-else
          @click="nextQuestion"
          class="question-btn"
        />
      </transition>
      <slot></slot>
    </div>

    <div class="attemptprogress-container" :class="{ mobile: isMobile }">
      <p class="message">
        {{ $tr('goal', {count: totalCorrectRequiredM}) }}
      </p>
      <exercise-attempts
        class="attemptprogress"
        :waitingForAttempt="firstAttemptAtQuestion"
        :numSpaces="attemptsWindowN"
        :log="recentAttempts"
      />
      <p class="status">
        <span class="try-again" v-if="!correct && !firstAttemptAtQuestion && !hintWasTaken">
          {{ $tr('tryAgain') }}
        </span>
        <span class="correct" v-if="correct && !firstAttemptAtQuestion && !hintWasTaken">
          {{ $tr('correct') }}
        </span>
      </p>
    </div>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import * as getters from 'kolibri.coreVue.vuex.getters';
  import * as actions from 'kolibri.coreVue.vuex.actions';
  import { InteractionTypes, MasteryModelGenerators } from 'kolibri.coreVue.vuex.constants';
  import seededShuffle from 'kolibri.lib.seededshuffle';
  import { now } from 'kolibri.utils.serverClock';
  import { updateContentNodeProgress } from '../../state/actions/main';
  import exerciseAttempts from './exercise-attempts';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';

  export default {
    name: 'assessmentWrapper',
    components: {
      exerciseAttempts,
      contentRenderer,
      kButton,
      uiAlert,
    },
    mixins: [responsiveWindow],
    $trs: {
      goal:
        'Try to get {count, number, integer} {count, plural, one {check mark} other {check marks}} to show up:',
      tryAgain: 'Try again!',
      correct: 'Correct!',
      check: 'Check',
      next: 'Next question',
      itemError: 'There was an error showing this item',
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      kind: {
        type: String,
        required: true,
      },
      files: {
        type: Array,
        default: () => [],
      },
      contentId: {
        type: String,
        default: '',
      },
      channelId: {
        type: String,
        default: '',
      },
      available: {
        type: Boolean,
        default: false,
      },
      extraFields: {
        type: String,
        default: '{}',
      },
      initSession: {
        type: Function,
        default: () => Promise.resolve(),
      },
      checkButtonIsPrimary: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      ready: false,
      itemId: '',
      shake: false,
      firstAttemptAtQuestion: true,
      complete: false,
      correct: 0,
      itemError: false,
      hintWasTaken: false,
      // Attempted fix for #1725
      checkingAnswer: false,
    }),
    computed: {
      recentAttempts() {
        if (!this.pastattempts) {
          return [];
        }
        return this.pastattempts
          .map(attempt => {
            if (attempt.hinted) {
              return 'hint';
            }
            return attempt.correct ? 'right' : 'wrong';
          })
          .reverse();
      },
      mOfNMasteryModel() {
        return MasteryModelGenerators[this.masteryModel.type](this.assessmentIds, this.masteryModel);
      },
      totalCorrectRequiredM() {
        return this.mOfNMasteryModel.m;
      },
      attemptsWindowN() {
        return this.mOfNMasteryModel.n;
      },
      exerciseProgress() {
        if (this.mastered) {
          return 1;
        }
        if (this.pastattempts) {
          if (this.pastattempts.length > this.attemptsWindowN) {
            return Math.min(
              this.pastattempts.slice(0, this.attemptsWindowN).reduce((a, b) => a + b.correct, 0) /
                this.totalCorrectRequiredM,
              1
            );
          }
          return Math.min(
            this.pastattempts.reduce((a, b) => a + b.correct, 0) / this.totalCorrectRequiredM,
            1
          );
        }
        return 0;
      },
      success() {
        return this.exerciseProgress === 1;
      },
      isMobile() {
        return this.windowSize.breakpoint <= 1;
      },
    },
    watch: { exerciseProgress: 'updateExerciseProgressMethod' },
    beforeDestroy() {
      this.saveAttemptLogMasterLog(false);
    },
    methods: {
      updateAttemptLogMasteryLog({
        correct,
        complete,
        firstAttempt = false,
        hinted,
        answerState,
        simpleAnswer,
      }) {
        this.updateMasteryAttemptStateAction({
          currentTime: now(),
          correct,
          complete,
          firstAttempt,
          hinted,
          answerState,
          simpleAnswer,
        });
      },
      saveAttemptLogMasterLog(updateStore = true) {
        if (updateStore) {
          this.saveAndStoreAttemptLogAction().then(() => {
            if (this.isUserLoggedIn && this.success) {
              this.setMasteryLogCompleteAction(now());
              this.saveAndStoreMasteryLogAction();
            }
          });
        } else {
          this.saveAttemptLogAction().then(() => {
            if (this.isUserLoggedIn && this.success) {
              this.saveMasteryLogAction();
            }
          });
        }
      },
      checkAnswer() {
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
        this.updateAttemptLogInteractionHistoryAction({
          type: InteractionTypes.answer,
          answer: answerState,
          correct,
        });
        this.complete = correct === 1;
        if (this.firstAttemptAtQuestion) {
          this.firstAttemptAtQuestion = false;
          this.updateAttemptLogMasteryLog({
            correct,
            complete: this.complete,
            answerState,
            simpleAnswer,
            firstAttempt: true,
          });
          // Save attempt log on first attempt
          this.saveAttemptLogMasterLog();
        } else {
          this.updateAttemptLogMasteryLog({
            complete: this.complete,
          });
          if (this.complete) {
            // Otherwise only save if the attempt is now complete
            this.saveAttemptLogMasterLog();
          }
        }
      },
      hintTaken({ answerState }) {
        this.updateAttemptLogInteractionHistoryAction({
          type: InteractionTypes.hint,
          answer: answerState,
        });
        if (this.firstAttemptAtQuestion) {
          this.updateAttemptLogMasteryLog({
            correct: 0,
            complete: false,
            firstAttempt: true,
            hinted: true,
            answerState,
            simpleAnswer: '',
          });
          this.firstAttemptAtQuestion = false;
          this.hintWasTaken = true;
          // Only save if this was the first attempt to capture this
          this.saveAttemptLogMasterLog();
        }
      },
      setItemId() {
        const index = this.totalattempts % this.assessmentIds.length;
        if (this.randomize) {
          if (this.userid) {
            this.itemId = seededShuffle.shuffle(this.assessmentIds, this.userid, true)[index];
          } else {
            this.itemId = seededShuffle.shuffle(this.assessmentIds, Date.now(), true)[index];
          }
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
        this.setItemId();
        this.createAttemptLog();
      },
      initMasteryLog() {
        this.initMasteryLogAction(this.masterySpacingTime, this.masteryModel);
      },
      createAttemptLog() {
        this.ready = false;
        this.createAttemptLogAction(this.itemId);
        this.ready = true;
      },
      updateExerciseProgressMethod() {
        this.updateExerciseProgress(this.exerciseProgress);
        updateContentNodeProgress(this.channelId, this.id, this.exerciseProgress);
      },
      sessionInitialized() {
        if (this.isUserLoggedIn) {
          this.initMasteryLog();
        } else {
          this.createDummyMasteryLogAction();
        }
        this.nextQuestion();
        this.$emit('sessionInitialized');
      },
      handleItemError() {
        this.itemError = true;
        this.updateAttemptLogInteractionHistoryAction({
          type: InteractionTypes.error,
        });
        this.complete = true;
        if (this.firstAttemptAtQuestion) {
          this.updateAttemptLogMasteryLog({
            correct: 1,
            complete: this.complete,
            firstAttempt: true,
          });
          this.firstAttemptAtQuestion = false;
        } else {
          this.updateAttemptLogMasteryLog({ complete: this.complete });
        }
      },
      updateProgress(...args) {
        this.$emit('updateProgress', ...args);
      },
      startTracking(...args) {
        this.$emit('startTracking', ...args);
      },
      stopTracking(...args) {
        this.$emit('stopTracking', ...args);
      },
    },
    vuex: {
      actions: {
        initMasteryLogAction: actions.initMasteryLog,
        createDummyMasteryLogAction: actions.createDummyMasteryLog,
        saveMasteryLogAction: actions.saveMasteryLog,
        saveAndStoreMasteryLogAction: actions.saveAndStoreMasteryLog,
        setMasteryLogCompleteAction: actions.setMasteryLogComplete,
        createAttemptLogAction: actions.createAttemptLog,
        saveAttemptLogAction: actions.saveAttemptLog,
        saveAndStoreAttemptLogAction: actions.saveAndStoreAttemptLog,
        updateMasteryAttemptStateAction: actions.updateMasteryAttemptState,
        updateAttemptLogInteractionHistoryAction: actions.updateAttemptLogInteractionHistory,
        updateExerciseProgress: actions.updateExerciseProgress,
      },
      getters: {
        isUserLoggedIn: getters.isUserLoggedIn,
        mastered: state => state.core.logging.mastery.complete,
        totalattempts: state => state.core.logging.mastery.totalattempts,
        pastattempts: state => state.core.logging.mastery.pastattempts,
        userid: state => state.core.session.user_id,
        content: state => state.pageState.content,
        assessmentIds: state => state.pageState.content.assessmentIds,
        masteryModel: state => state.pageState.content.masteryModel,
        randomize: state => state.pageState.content.randomize,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .message
    color: $core-text-annotation
    margin: 0

  .status
    font-weight: bold
    min-height: 14px
    margin: 0

  .try-again
    color: $core-status-wrong

  .correct
    color: $core-status-correct

  .attemptprogress-container
    position: relative
    margin-top: 8px

  .attemptprogress-container.mobile
    font-size: smaller
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.5), 0 3px 6px rgba(0, 0, 0, 0.6)
    background-color: $core-bg-light
    margin: 0
    padding: 8px
    position: fixed
    width: 100%
    height: 88px // if changed, also change BOTTOM_SPACED_RESERVED in top-level index
    overflow-x: auto
    overflow-y: hidden
    z-index: 3 // material - Quick entry / Search bar (scrolled state)
    bottom: 0
    left: 0

  .question-btn
    margin-left: 1.5em

  // checkAnswer btn animation
  .shaking
    animation: shake 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both
    transform: translate3d(0, 0, 0)
    backface-visibility: hidden
    perspective: 1000px

  @keyframes shake
    10%, 90%
      transform: translate3d(-1px, 0, 0)
    20%, 80%
      transform: translate3d(2px, 0, 0)
    30%, 50%, 70%
      transform: translate3d(-4px, 0, 0)
    40%, 60%
      transform: translate3d(4px, 0, 0)

</style>
