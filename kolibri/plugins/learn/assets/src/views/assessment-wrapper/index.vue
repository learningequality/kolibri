<!--
This template is intended to act as the default wrapper for assessment focused rendering
plugins.

As such, it provides display of current mastery progress, and manages all mastery/attempt log
oriented data synchronization.
-->


<template v-if="ready">

  <div id="exercise-container">
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
        @updateProgress="updateProgress"/>
    </div>

    <div>
      <transition mode="out-in">
        <k-button
          :text="$tr('check')"
          :primary="false"
          :raised="true"
          v-if="!complete"
          @click="checkAnswer"
          class="question-btn"
          :class="{shaking: shake}"
          :disabled="checkingAnswer"
        />
        <k-button
          :text="$tr('correct')"
          :primary="true"
          :raised="true"
          v-else
          @click="nextQuestion"
          class="question-btn"
        />
      </transition>
      <slot/>
    </div>

    <div id="attemptprogress-container">
      <exercise-attempts
        class="attemptprogress"
        :waitingForAttempt="firstAttempt"
        :success="success"
        :numSpaces="attemptsWindowN"
        :log="recentAttempts"
      />
      <p class="message">{{ $tr('goal', {count: totalCorrectRequiredM}) }}</p>
      <p id="try-again" v-if="correct < 1 && !firstAttempt && !onlyHinted">{{ $tr('tryAgain') }}</p>
    </div>
  </div>

</template>


<script>

  import * as getters from 'kolibri.coreVue.vuex.getters';
  import * as actions from 'kolibri.coreVue.vuex.actions';
  import { InteractionTypes } from 'kolibri.coreVue.vuex.constants';
  import { MasteryModelGenerators } from 'kolibri.coreVue.vuex.constants';
  import seededShuffle from 'kolibri.lib.seededshuffle';
  import { now } from 'kolibri.utils.serverClock';
  import { updateContentNodeProgress } from '../../state/actions';
  import exerciseAttempts from 'kolibri.coreVue.components.exerciseAttempts';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'keen-ui/src/UiAlert';
  export default {
    name: 'assessmentWrapper',
    $trs: {
      goal:
        'Try to get {count, number, integer} {count, plural, one {check mark} other {check marks}} to show up',
      tryAgain: 'Try again!',
      check: 'Check',
      correct: 'Next question',
      incorrect: 'Sorry, try again',
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
    },
    watch: { exerciseProgress: 'updateExerciseProgressMethod' },
    components: {
      exerciseAttempts,
      contentRenderer,
      kButton,
      uiAlert,
    },
    data: () => ({
      ready: false,
      itemId: '',
      shake: false,
      firstAttempt: true,
      complete: false,
      correct: 0,
      itemError: false,
      onlyHinted: false,
      // Attempted fix for #1725
      checkingAnswer: false,
    }),
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
      saveAttemptLogMasterLog() {
        this.saveAttemptLogAction().then(() => {
          if (this.canLogInteractions && this.success) {
            this.setMasteryLogCompleteAction(now());
            this.saveMasteryLogAction();
          }
        });
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
        this.onlyHinted = false;
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
        if (this.firstAttempt) {
          this.firstAttempt = false;
          this.updateAttemptLogMasteryLog({
            correct,
            complete: this.complete,
            answerState,
            simpleAnswer,
            firstAttempt: true,
          });
        } else {
          this.updateAttemptLogMasteryLog({ complete: this.complete });
        }
        this.saveAttemptLogMasterLog();
      },
      hintTaken({ answerState }) {
        this.updateAttemptLogInteractionHistoryAction({
          type: InteractionTypes.hint,
          answer: answerState,
        });
        if (this.firstAttempt) {
          this.updateAttemptLogMasteryLog({
            correct: 0,
            complete: false,
            firstAttempt: true,
            hinted: true,
            answerState,
            simpleAnswer: '',
          });
          this.firstAttempt = false;
          this.onlyHinted = true;
        }
        this.saveAttemptLogMasterLog();
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
        this.firstAttempt = true;
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
        if (this.canLogInteractions) {
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
        if (this.firstAttempt) {
          this.updateAttemptLogMasteryLog({
            correct: 1,
            complete: this.complete,
            firstAttempt: true,
          });
          this.firstAttempt = false;
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
    computed: {
      canLogInteractions() {
        return !this.isSuperuser && this.isUserLoggedIn;
      },
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
    },
    vuex: {
      actions: {
        initMasteryLogAction: actions.initMasteryLog,
        createDummyMasteryLogAction: actions.createDummyMasteryLog,
        saveMasteryLogAction: actions.saveMasteryLog,
        setMasteryLogCompleteAction: actions.setMasteryLogComplete,
        createAttemptLogAction: actions.createAttemptLog,
        saveAttemptLogAction: actions.saveAttemptLog,
        updateMasteryAttemptStateAction: actions.updateMasteryAttemptState,
        updateAttemptLogInteractionHistoryAction: actions.updateAttemptLogInteractionHistory,
        updateExerciseProgress: actions.updateExerciseProgress,
      },
      getters: {
        isSuperuser: getters.isSuperuser,
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
    padding: 16px
    font-size: 14px
    @media screen and (max-width: $portrait-breakpoint)
      position: relative
      text-align: center
      clear: both
      top: 40px
      font-size: 12px
      margin-top: 0
      padding: 0

  .attemptprogress
    position: absolute
    padding-left: 14px
    top: 38px
    @media screen and (max-width: $portrait-breakpoint)
      top: 0
      padding-left: 0
      left: 50%
      transform: translate(-50%, 0)

  #attemptprogress-container
    border-radius: $radius
    position: relative
    background-color: $core-bg-light
    height: 104px
    @media screen and (max-width: $portrait-breakpoint)
      position: fixed
      height: 60px
      width: 100%
      border-radius: 0
      bottom: 0
      border-bottom: thin solid $core-text-annotation
      border-top: thin solid $core-text-annotation
      z-index: 2
      left: 0

  #try-again
    color: $core-text-error
    font-size: 14px
    font-weight: bold
    padding: 16px
    padding-top: 20px

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
