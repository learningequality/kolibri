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
      <k-button
        appearance="basic-link"
        :text="$tr('tryDifferentQuestion')"
        @click="nextQuestion"
      />
    </ui-alert>
    <div>
      <content-renderer
        ref="contentRenderer"
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
        @updateProgress="updateProgress"
      />
    </div>

    <div
      class="attempts-container"
      :class="{ 'mobile': windowSize.breakpoint < 2}"
    >
      <div class="margin-wrapper">
        <div class="overall-status">
          <mat-svg
            name="stars"
            category="action"
            :class="success ? 'mastered' : 'not-mastered'"
          />
          <div class="overall-status-text">
            <div v-if="success" class="completed">
              {{ $tr('completed') }}
            </div>
            <div>
              {{ $tr('goal', {count: totalCorrectRequiredM}) }}
            </div>
          </div>
        </div>
        <div class="table">
          <div class="row">
            <div class="left">
              <transition mode="out-in">
                <k-button
                  v-if="!complete"
                  appearance="raised-button"
                  class="question-btn"
                  :text="$tr('check')"
                  :primary="true"
                  :class="{shaking: shake}"
                  :disabled="checkingAnswer"
                  @click="checkAnswer"
                />
                <k-button
                  v-else
                  appearance="raised-button"
                  class="question-btn"
                  :text="$tr('next')"
                  :primary="true"
                  @click="nextQuestion"
                />
              </transition>
            </div>

            <div class="right">
              <exercise-attempts
                :waitingForAttempt="firstAttemptAtQuestion || itemError"
                :numSpaces="attemptsWindowN"
                :log="recentAttempts"
              />
              <p class="current-status">{{ currentStatus }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import {
    initMasteryLog,
    createDummyMasteryLog,
    saveMasteryLog,
    saveAndStoreMasteryLog,
    setMasteryLogComplete,
    createAttemptLog,
    saveAttemptLog,
    saveAndStoreAttemptLog,
    updateMasteryAttemptState,
    updateAttemptLogInteractionHistory,
    updateExerciseProgress,
  } from 'kolibri.coreVue.vuex.actions';
  import { InteractionTypes, MasteryModelGenerators } from 'kolibri.coreVue.vuex.constants';
  import seededShuffle from 'kolibri.lib.seededshuffle';
  import { now } from 'kolibri.utils.serverClock';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import { updateContentNodeProgress } from '../../state/actions/main';
  import exerciseAttempts from './exercise-attempts';

  export default {
    name: 'assessmentWrapper',
    components: {
      exerciseAttempts,
      contentRenderer,
      kButton,
      uiAlert,
      kRouterLink,
    },
    mixins: [responsiveWindow],
    $trs: {
      goal: 'Get {count, number, integer} {count, plural, other {correct}}',
      tryAgain: 'Try again',
      correct: 'Correct!',
      check: 'Check',
      next: 'Next',
      itemError: 'There was an error showing this item',
      completed: 'Completed',
      inputAnswer: 'Please enter an answer above',
      hintUsed: 'Hint used',
      greatKeepGoing: 'Great! Keep going',
      tryDifferentQuestion: 'Try a different question',
      tryNextQuestion: 'Try next question',
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
      checkWasAttempted: false,
    }),
    computed: {
      recentAttempts() {
        if (!this.pastattempts) {
          return [];
        }
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
          this.masteryModel
        );
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
        error,
      }) {
        this.updateMasteryAttemptState({
          currentTime: now(),
          correct,
          complete,
          firstAttempt,
          hinted,
          answerState,
          simpleAnswer,
          error,
        });
      },
      saveAttemptLogMasterLog(updateStore = true) {
        if (updateStore) {
          this.saveAndStoreAttemptLog().then(() => {
            if (this.isUserLoggedIn && this.success) {
              this.setMasteryLogComplete(now());
              this.saveAndStoreMasteryLog();
            }
          });
        } else {
          this.saveAttemptLog().then(() => {
            if (this.isUserLoggedIn && this.success) {
              this.saveMasteryLog();
            }
          });
        }
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
        this.updateAttemptLogInteractionHistory({
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
        this.updateAttemptLogInteractionHistory({
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
          // Only save if this was the first attempt to capture this
          this.saveAttemptLogMasterLog();
        }
        this.hintWasTaken = true;
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
        this.callCreateAttemptLog();
        this.checkWasAttempted = false;
      },
      callInitMasteryLog() {
        this.initMasteryLog(this.masterySpacingTime, this.masteryModel);
      },
      callCreateAttemptLog() {
        this.ready = false;
        this.createAttemptLog(this.itemId);
        this.ready = true;
      },
      updateExerciseProgressMethod() {
        this.updateExerciseProgress(this.exerciseProgress);
        updateContentNodeProgress(this.channelId, this.id, this.exerciseProgress);
      },
      sessionInitialized() {
        if (this.isUserLoggedIn) {
          this.callInitMasteryLog();
        } else {
          this.createDummyMasteryLog();
        }
        this.nextQuestion();
        this.$emit('sessionInitialized');
      },
      handleItemError() {
        this.itemError = true;
        this.updateAttemptLogInteractionHistory({
          type: InteractionTypes.error,
        });
        this.complete = true;
        if (this.firstAttemptAtQuestion) {
          this.updateAttemptLogMasteryLog({
            correct: 0,
            complete: this.complete,
            firstAttempt: true,
            error: true,
          });
          this.firstAttemptAtQuestion = false;
        } else {
          this.updateAttemptLogMasteryLog({ complete: this.complete });
        }
        this.saveAttemptLogMasterLog();
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
        initMasteryLog,
        createDummyMasteryLog,
        saveMasteryLog,
        saveAndStoreMasteryLog,
        setMasteryLogComplete,
        createAttemptLog,
        saveAttemptLog,
        saveAndStoreAttemptLog,
        updateMasteryAttemptState,
        updateAttemptLogInteractionHistory,
        updateExerciseProgress,
      },
      getters: {
        isUserLoggedIn,
        mastered: state => state.core.logging.mastery.complete,
        totalattempts: state => state.core.logging.mastery.totalattempts,
        pastattempts: state =>
          (state.core.logging.mastery.pastattempts || []).filter(attempt => attempt.error !== true),
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

  // BOTTOM_SPACED_RESERVED depends on the height of this container
  .attempts-container
    position: fixed
    bottom: 0
    right: 0
    left: 0
    margin: 0
    padding: 8px 16px
    overflow-x: hidden
    z-index: 8 // material - Bottom app bar
    font-size: 14px
    background-color: $core-bg-light
    box-shadow: 0 8px 10px -5px rgba(0, 0, 0, 0.2),
                0 16px 24px 2px rgba(0, 0, 0, 0.14),
                0 6px 30px 5px rgba(0, 0, 0, 0.12)

  .margin-wrapper
    max-width: 1000px - 64px // account for page padding
    margin: auto

  .mobile
      padding: 8px

  .overall-status
    color: $core-text-default
    margin-bottom: 8px

  .mastered, .not-mastered
    vertical-align: bottom

  .mastered
    fill: $core-status-mastered

  .not-mastered
    fill: $core-grey

  .overall-status-text
    display: inline-block
    margin-left: 4px

  .completed
    color: $core-text-annotation
    font-size: 12px

  .table
    display: table

  .row
    display: table-row

  .left, .right
    display: table-cell
    vertical-align: top

  .right
    overflow-x: auto
    overflow-y: hidden
    padding-left: 8px
    width: 99%

  .question-btn
    margin: 0

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

  .current-status
    margin: 0
    height: 18px

</style>
