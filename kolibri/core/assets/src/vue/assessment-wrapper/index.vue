<!--
This template is intended to act as the default wrapper for assessment focused rendering
plugins.

As such, it provides display of current mastery progress, and manages all mastery/attempt log
oriented data synchronization.
-->


<template>

  <div>
    <slot v-if="ready"></slot>
  </div>

</template>


<script>

  const actions = require('kolibri.coreVue.vuex.actions');
  const InteractionTypes = require('kolibri.coreVue.vuex.constants').InteractionTypes;
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    props: {
      itemId: {
        type: String,
      },
      masterySpacingTime: {
        type: Number,
      },
      masteryCriterion: {
        type: String,
      },
    },
    data: () => ({
      ready: false,
    }),
    created() {
      this.$on('updateAMLogs', (correct, complete, firstAttempt, hinted) => {
        this.updateAttemptLogMasetryLog(correct, complete, firstAttempt, hinted);
      });
      this.$on('saveAMLogs', (exercisePassed) => { this.saveAttemptLogMasterLog(exercisePassed);});
      this.$on('takehint', (firstAttempt, hinted) => { this.hintTaken(firstAttempt, hinted);});
      this.$on('toNextQuestion', () => { this.nextQuestion();});
      // Once the data for the overall assessment is loaded in the renderer
      // we can initialize the mastery log, as the mastery model and spacing time
      // will be available.
      if (this.isLearner) {
        this.initMasteryLog();
      } else {
        // if userKind is anonymous user or deviceOwner.
        this.createDummyMasteryLogAction(this.Kolibri);
      }
      this.createAttemptLog().then(() => {
        this.ready = true;
      });
    },
    methods: {
      updateAttemptLogMasetryLog(correct, complete, firstAttempt, hinted) {
        this.updateMasteryAttemptStateAction(new Date(), correct, complete, firstAttempt, hinted);
      },
      saveAttemptLogMasterLog(exercisePassed) {
        if (this.masteryLogId || !this.isLearner) {
          this.saveAttemptLogAction(this.Kolibri).then(() => {
            if (this.isLearner && exercisePassed) {
              this.setMasteryLogCompleteAction(new Date());
              this.saveMasteryLogAction(this.Kolibri);
            }
          });
        } else {
          const watchRevoke = this.$watch('masteryLogId', () => {
            if (this.masteryLogId) {
              this.saveAttemptLogAction(this.Kolibri).then(() => {
                if (this.isLearner && exercisePassed) {
                  this.setMasteryLogCompleteAction(new Date());
                  this.saveMasteryLogAction(this.Kolibri);
                }
              });
              watchRevoke();
            }
          });
        }
      },
      hintTaken(firstAttempt, hinted) {
        this.updateAttemptLogInteractionHistoryAction(InteractionTypes.hint);
        this.updateMasetryLogSaveAttemptLog(0, false, firstAttempt, hinted);
      },
      nextQuestion() {
        this.createAttemptLog().then(() => {
          this.ready = true;
          this.$emit('nextquestion');
        });
      },
      initMasteryLog() {
        // Only initialize masteryLogs once the summaryLog is initialized.
        if (!this.summaryLogId) {
          const watchRevoke = this.$watch('summaryLogId', () => {
            if (this.summaryLogId) {
              this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime, this.masteryCriterion);
              watchRevoke();
            }
          });
        } else {
          this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime, this.masteryCriterion);
        }
      },
      createAttemptLog() {
        return new Promise((resolve, reject) => {
          this.ready = false;
          if (!this.itemId) {
            const watchRevoke = this.$watch('itemId', () => {
              if (this.itemId) {
                this.createAttemptLogAction(this.Kolibri, this.itemId, this.newAttemptlogReady);
                resolve();
                watchRevoke();
              }
            });
          } else {
            this.createAttemptLogAction(this.Kolibri, this.itemId, this.newAttemptlogReady);
            resolve();
          }
        });
      },
    },
    computed: {
      isLearner() {
        return this.userkind.includes(UserKinds.LEARNER);
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
      },
      getters: {
        summaryLogId: (state) => state.core.logging.summary.id,
        masteryLogId: (state) => state.core.logging.mastery.id,
        attemptLogComplete: (state) => state.core.logging.attempt.complete,
        attemptLogCorrect: (state) => state.core.logging.attempt.correct,
        userkind: (state) => state.core.session.kind,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
