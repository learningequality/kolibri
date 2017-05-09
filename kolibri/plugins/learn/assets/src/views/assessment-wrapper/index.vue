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
        @answerGiven="answerGiven"
        @hintTaken="hintTaken"
        @sessionInitialized="sessionInitialized"
        @itemError="handleItemError"/>
    </div>

    <div>
      <icon-button
        :text="$tr('check')"
        :primary="true"
        v-show="!complete"
        @click="checkAnswer"
        class="question-btn check-answer-button"
        :class="{shaking: shake}"
      />
      <transition name="delay">
        <icon-button
          :text="$tr('correct')"
          :primary="true"
          v-show="complete"
          @click="nextQuestion"
          class="question-btn next-question-button"
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
      <p id="try-again" v-if="correct < 1 && !firstAttempt">{{ $tr('tryAgain') }}</p>
    </div>
  </div>

</template>


<script>

  const getters = require('kolibri.coreVue.vuex.getters');
  const actions = require('kolibri.coreVue.vuex.actions');
  const { InteractionTypes } = require('kolibri.coreVue.vuex.constants');
  const { MasteryModelGenerators } = require('kolibri.coreVue.vuex.constants');
  const seededShuffle = require('kolibri.lib.seededshuffle');
  const { now } = require('kolibri.utils.serverClock');

  module.exports = {
    $trNameSpace: 'assessmentWrapper',
    $trs: {
      goal: 'Try to get {count, number, integer} {count, plural, one {check mark} other {check marks}} to show up',
      tryAgain: 'Try again!',
      check: 'Check answer',
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
    },
    watch: {
      exerciseProgress: 'updateExerciseProgressMethod',
    },
    components: {
      'exercise-attempts': require('kolibri.coreVue.components.exerciseAttempts'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-alert': require('keen-ui/src/UiAlert'),
    },
    data: () => ({
      ready: false,
      itemId: '',
      shake: false,
      firstAttempt: true,
      complete: false,
      correct: 0,
      itemError: false,
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
        const answer = this.$refs.contentRenderer.checkAnswer();
        if (answer) {
          this.answerGiven(answer);
        }
      },
      answerGiven({ correct, answerState, simpleAnswer }) {
        correct = Number(correct); // eslint-disable-line no-param-reassign
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
          this.updateAttemptLogMasteryLog({
            correct,
            complete: this.complete,
            answerState,
            simpleAnswer,
            firstAttempt: true,
          });
          this.firstAttempt = false;
        } else {
          this.updateAttemptLogMasteryLog({
            complete: this.complete,
          });
        }
        this.saveAttemptLogMasterLog();
      },
      hintTaken({ answerState }) {
        this.updateAttemptLogInteractionHistoryAction({
          type: InteractionTypes.hint,
          answer: answerState,
        });
        if (this.firstAttempt) {
          // mark the attemptlog as hinted only if the first attempt is taking the hint.
          this.updateAttemptLogMasteryLog({
            correct: 0,
            complete: false,
            firstAttempt: true,
            hinted: true,
            answerState,
            simpleAnswer: '',
          });
          this.firstAttempt = false;
        }
        this.saveAttemptLogMasterLog();
      },
      setItemId() {
        const index = this.totalattempts % this.assessmentIds.length;
        if (this.randomize) {
          if (this.userid) {
            this.itemId = seededShuffle.shuffle(this.assessmentIds, this.userid, true)[index];
          } else {
            this.itemId = seededShuffle.shuffle(this.assessmentIds, new Date(), true)[index];
          }
        } else {
          this.itemId = this.assessmentIds[index];
        }
      },
      nextQuestion() {
        // Consistently get the next item in the sequence depending on how many previous
        // attempts have been made.
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
      },
      sessionInitialized() {
        // Once the session is initialized we can initialize the mastery log,
        // as the required data will be available.
        if (this.canLogInteractions) {
          this.initMasteryLog();
        } else {
          // if userKind is anonymous user or deviceOwner.
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
          this.updateAttemptLogMasteryLog({
            complete: this.complete,
          });
        }
      },
    },
    computed: {
      canLogInteractions() {
        return !this.isSuperuser;
      },
      recentAttempts() {
        if (!this.pastattempts) {
          return [];
        }
        // map the list of attempt objects to simple strings
        // ordered from first to last
        return this.pastattempts.map(attempt => {
          if (attempt.hinted) {
            return 'hint';
          }
          return attempt.correct ? 'right' : 'wrong';
        }).reverse();
      },
      mOfNMasteryModel() {
        return MasteryModelGenerators[this.masteryModel.type](
          this.assessmentIds, this.masteryModel);
      },
      totalCorrectRequiredM() {
        return this.mOfNMasteryModel.m;
      },
      attemptsWindowN() {
        return this.mOfNMasteryModel.n;
      },
      exerciseProgress() {
        if (this.pastattempts) {
          if (this.pastattempts.length > this.attemptsWindowN) {
            return Math.min(
              this.pastattempts.slice(
                0,
                this.attemptsWindowN
              ).reduce((a, b) => a + b.correct, 0) / this.totalCorrectRequiredM,
              1.0
              );
          }
          return Math.min(
            this.pastattempts.reduce((a, b) => a + b.correct, 0) / this.totalCorrectRequiredM,
            1.0
            );
        }
        return 0.0;
      },
      success() {
        return this.exerciseProgress === 1.0;
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
        totalattempts: (state) => state.core.logging.mastery.totalattempts,
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
        userid: (state) => state.core.session.user_id,
        content: (state) => state.pageState.content,
        assessmentIds: (state) => state.pageState.content.assessmentIds,
        masteryModel: (state) => state.pageState.content.masteryModel,
        randomize: (state) => state.pageState.content.randomize,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .message
    color: grey
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
      z-index: 10
      left: 0

  #try-again
    color: #DF0F0F
    font-size: 14px
    font-weight: bold
    padding: 16px
    padding-top: 20px

  .question-btn
    color: $core-bg-light
    padding-left: 16px
    padding-right: 16px
    margin-left: 1.5em

  .check-answer-button
    background-color: $core-action-normal

  .next-question-button
    background-color: #43A047
    &:hover
      &:not(.is-disabled)
        background-color: #2a7d2e

  // next-question-button transition effect
  .delay-enter-active
    background-color: #43A047
    transition: background-color 1s

  .delay-enter
    background-color: $core-action-normal

  .delay-leave-active
    display: none

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
