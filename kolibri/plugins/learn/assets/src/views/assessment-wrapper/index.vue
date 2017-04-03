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
    <div class="button-drawer">
      <icon-button @click="checkAnswer" v-show="!complete" class="question-btn" :class="{shaking: shake}" id="check-answer-button" :text="$tr('check')"></icon-button>
      <transition name="delay">
        <icon-button @click="nextQuestion" v-show="complete" class="question-btn next-question-button" :text="$tr('correct')"></icon-button>
      </transition>
      <slot/>
    </div>
    <div id="attemptprogress-container">
      <exercise-attempts
        class="attemptprogress"
        :waiting="!complete"
        :success="success"
        :numSpaces="attemptsWindowN"
        :log="recentAttempts"
      />
      <p class="message">{{ $tr('goal', {count: totalCorrectRequiredM}) }}</p>
      <p id="try-again" v-if="!correct && !firstAttempt">{{ $tr('tryAgain') }}</p>
    </div>
  </div>

</template>


<script>

  const actions = require('kolibri.coreVue.vuex.actions');
  const InteractionTypes = require('kolibri.coreVue.vuex.constants').InteractionTypes;
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;
  const MasteryModelGenerators = require('kolibri.coreVue.vuex.constants').MasteryModelGenerators;
  const seededShuffle = require('kolibri.lib.seededshuffle');

  module.exports = {
    $trNameSpace: 'assessmentWrapper',
    $trs: {
      goal: 'Try to get {count, number, integer} ' +
        '{count, plural, one {check mark} other {check marks}} to show up',
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
      correct: true,
      itemError: false,
    }),
    methods: {
      updateAttemptLogMasteryLog({
        correct,
        complete,
        firstAttempt = false,
        hinted = false,
        answerState,
        simpleAnswer,
      }) {
        this.updateMasteryAttemptStateAction({
          currentTime: new Date(),
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
          if (this.isFacilityUser && this.success) {
            this.setMasteryLogCompleteAction(new Date());
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
        this.correct = correct;
        if (!correct) {
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
        this.complete = correct;
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
            hinted: true
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
        this.shake = false;
        this.firstAttempt = true;
        this.complete = false;
        this.correct = true;
        this.itemError = false;
        this.setItemId();
        this.createAttemptLog();
      },
      initMasteryLog() {
        this.initMasteryLogAction(this.masterySpacingTime, JSON.stringify(this.masteryModel));
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
        if (this.isFacilityUser) {
          this.initMasteryLog();
        } else {
          // if userKind is anonymous user or deviceOwner.
          this.createDummyMasteryLogAction();
        }
        this.nextQuestion();
      },
      handleItemError() {
        this.itemError = true;
        this.updateAttemptLogInteractionHistoryAction({
          type: InteractionTypes.error,
        });
        this.complete = true;
        if (this.firstAttempt) {
          this.updateAttemptLogMasteryLog({
            correct: true,
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
      isFacilityUser() {
        return !(this.userkind.includes(UserKinds.SUPERUSER) ||
          this.userkind.includes(UserKinds.ANONYMOUS));
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
        userkind: (state) => state.core.session.kind,
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
      bottom: $nav-portrait-height
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

  .button-drawer
    display: inline-block
    button
      margin-left: 5px

  .question-btn
    float: left
    color: $core-bg-light
    padding-left: 16px
    padding-right: 16px

  #check-answer-button
    background-color: $core-action-normal

  .next-question-button
    background-color: #43A047

  // next-question-button transition effect
  .delay-enter-active
    background-color: #43A047
    transition: background-color 1s

  .delay-enter
    background-color: $core-action-normal

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
