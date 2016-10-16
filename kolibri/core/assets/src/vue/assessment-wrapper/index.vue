<!--
This template is intended to act as the default wrapper for assessment focused rendering
plugins.

As such, it provides display of current mastery progress, and manages all mastery/attempt log
oriented data synchronization.
-->
<template>

  <div>
    <slot></slot>
  </div>

</template>


<script>

  const logging = require('kolibri/lib/logging').getLogger(__filename);

  const actions = require('kolibri/coreVue/vuex/actions');

  module.exports = {
    props: {
      itemId: {
        type: String,
      },
      assessmentDataLoaded: {
        type: Boolean,
      },
      masteryModel: {
        type: String,
      },
      masterySpacingTime: {
        type: Number,
      },
    },
    created() {
      this.$on('checkanswer', (answer) => { this.answerChecked(answer);});
      this.$on('takehint', () => { this.hintTaken();});
      this.$on('passexercise', () => { this.exercisePassed();});
      // Once the data for the overall assessment is loaded in the renderer
      // we can initialize the mastery log, as the mastery model and spacing time
      // will be available.
      if (this.assessmentDataLoaded) {
        this.initMasteryLog();
        this.initAttemptLog();
      } else {
        let watchRevoke;
        watchRevoke = this.$watch('assessmentDataLoaded', () => {
          if (this.assessmentDataLoaded) {
            this.initMasteryLog();
            this.initAttemptLog();
            watchRevoke();
          }
        });
      }
    },
    methods: {
      answerChecked(answer) {
        this.updateMasteryAttemptStateAction(new Date(), answer);
        if (this.masteryLogId) {
          // this.saveMasteryLogAction(this.Kolibri);
          this.saveAttemptLogAction(this.Kolibri);
        } else {
          let watchRevoke;
          watchRevoke = this.$watch('masteryLogId', () => {
            if (this.masteryLogId) {
              this.saveAttemptLogAction(this.Kolibri);
              watchRevoke();
            }
          });
          this.saveMasteryLogAction(this.Kolibri);
        }
      },
      hintTaken() {
        console.log('hinhinhin');
      },
      exercisePassed() {
        console.log('exercisePassedexercisePassed');
        this.setMasteryLogCompleteAction(true);
        this.saveMasteryLogAction(this.Kolibri);
      },
      initMasteryLog() {
        // Only initialize masteryLogs once the summaryLog is initialized.
        if (!this.summaryLogId) {
          let watchRevoke;
          watchRevoke = this.$watch('summaryLogId', () => {
            if (this.summaryLogId) {
              this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime, 'eli');
              watchRevoke();
            }
          });
        } else {
          this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime, 'eli');
        }
      },
      initNewAttemptLog() {
        if (this.itemId) {
          this.createAttemptLogAction(this.Kolibri, this.itemId);
        } else {
          let watchRevoke;
          watchRevoke = this.$watch('itemId', () => {
            if (this.itemId) {
              this.createAttemptLogAction(this.Kolibri, this.itemId);
              watchRevoke();
            }
          });
        }
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
      },
      getters: {
        summaryLogId: (state) => state.core.logging.summary.id,
        masteryLogId: (state) => state.core.logging.mastery.id,
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

</style>
