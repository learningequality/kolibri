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

  const logging = require('kolibri/lib/logging').getLogger(__filename);
  const actions = require('kolibri/coreVue/vuex/actions');
  const hint = require('../../constants').InteractionTypes.hint;

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
    created() {
      this.$on('checkanswer', (correct, complete) => { this.answerChecked(correct, complete);});
      this.$on('takehint', () => { this.hintTaken();});
      this.$on('passexercise', () => { this.exercisePassed();});
      // Once the data for the overall assessment is loaded in the renderer
      // we can initialize the mastery log, as the mastery model and spacing time
      // will be available.
      this.initMasteryLog();
      this.initNewAttemptLog();
    },
    methods: {
      answerChecked(correct, complete) {
        if (complete) {
          // question passed
          this.updateMasteryAttemptStateAction(new Date(), correct, complete);
          if (this.masteryLogId) {
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
        } else {
          this.updateMasteryAttemptStateAction(new Date(), correct, complete);
        }
      },
      hintTaken() {
        this.updateAttemptLogInteractionHistoryAction(hint);
      },
      exercisePassed() {
        this.setMasteryLogCompleteAction(new Date());
        this.saveMasteryLogAction(this.Kolibri);
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
          this.ready = false;
          this.createAttemptLogAction(this.Kolibri, this.itemId, this.newAttemptlogReady);
        }
        this.$watch('itemId', () => {
          // every new question has a new attemptlog with the question's itemId
          if (this.itemId) {
            this.ready = false;
            this.createAttemptLogAction(this.Kolibri, this.itemId, this.newAttemptlogReady);
          }
        });
      },
      newAttemptlogReady() {
        this.ready = true;
      },
    },
    vuex: {
      actions: {
        initMasteryLogAction: actions.initMasteryLog,
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
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
        attemptLogComplete: (state) => state.core.logging.attempt.complete,
        attemptLogCorrect: (state) => state.core.logging.attempt.correct,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

</style>
