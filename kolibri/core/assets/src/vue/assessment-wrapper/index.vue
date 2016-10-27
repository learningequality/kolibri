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

  const logging = require('kolibri.lib.logging').getLogger(__filename);
  const actions = require('kolibri.coreVue.vuex.actions');
  const InteractionTypes = require('kolibri.coreVue.vuex.constants').InteractionTypes;
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    props: {
      itemId: {
        type: String,
      },
      masteryModel: {
        type: String,
      },
      masterySpacingTime: {
        type: Number,
      },
      masteryCriterion: {
        type: String,
      }
    },
    data: () => ({
      ready: false,
    }),
    created() {
      this.$on('checkanswer', (correct, complete, firstAttempt, hinted) => { this.updateMasetryLogSaveAttemptLog(correct, complete, firstAttempt, hinted);});
      this.$on('takehint', (firstAttempt, hinted) => { this.hintTaken(firstAttempt, hinted);});
      this.$on('passexercise', () => { this.exercisePassed();});
      // Once the data for the overall assessment is loaded in the renderer
      // we can initialize the mastery log, as the mastery model and spacing time
      // will be available.
      if (this.isLearner) {
        this.initMasteryLog();
      } else {
        // if userKind is anonymous user or deviceOwner.
        this.createDummyMasteryLogAction(this.Kolibri);
      }
      this.initNewAttemptLog();
    },
    methods: {
      updateMasetryLogSaveAttemptLog(correct, complete, firstAttempt, hinted) {
        this.updateMasteryAttemptStateAction(new Date(), correct, complete, firstAttempt, hinted);
        if (this.masteryLogId || !this.isLearner) {
          this.saveAttemptLogAction(this.Kolibri);
        } else {
          let watchRevoke;
          watchRevoke = this.$watch('masteryLogId', () => {
            if (this.masteryLogId) {
              this.saveAttemptLogAction(this.Kolibri);
              watchRevoke();
            }
          });
        }
      },
      hintTaken(firstAttempt, hinted) {
        this.updateAttemptLogInteractionHistoryAction(InteractionTypes.hint);
        this.updateMasetryLogSaveAttemptLog(0, false, firstAttempt, hinted);
      },
      exercisePassed() {
        if (this.isLearner) {
          this.setMasteryLogCompleteAction(new Date());
          this.saveMasteryLogAction(this.Kolibri);
        }
      },
      initMasteryLog() {
        // Only initialize masteryLogs once the summaryLog is initialized.
        if (!this.summaryLogId) {
          let watchRevoke;
          watchRevoke = this.$watch('summaryLogId', () => {
            if (this.summaryLogId) {
              this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime, this.masteryCriterion);
              watchRevoke();
            }
          });
        } else {
          this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime, this.masteryCriterion);
        }
      },
      initNewAttemptLog() {
        if (this.itemId) {
          // seems sometimes vue does not reset itemId on page reload, therefore the following watch doesn't get triggered and ready is not set properly.
          this.createAttemptLog()
        }
        this.$watch('itemId', () => {
          // every new question has a new attemptlog with the question's itemId
          if (this.itemId) {
            this.createAttemptLog()
          }
        });
      },
      createAttemptLog() {
        this.ready = false;
        if (!this.sessionLogId) {
          let watchRevoke;
          watchRevoke = this.$watch('sessionLogId', () => {
            if (this.sessionLogId) {
              this.createAttemptLogAction(this.Kolibri, this.itemId, this.newAttemptlogReady);
              watchRevoke();
            }
          });
        } else {
          this.createAttemptLogAction(this.Kolibri, this.itemId, this.newAttemptlogReady);
        }
      },
      newAttemptlogReady() {
        this.ready = true;
      },
    },
    computed: {
      isLearner() {
        if (this.userkind.includes(UserKinds.LEARNER)) {
          return true;
        }
        return false;
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
        sessionLogId: (state) => state.core.logging.session.id,
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
