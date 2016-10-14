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
      // this.$parent.$once('assessmentDataLoaded', this.initMasteryLog);
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
      initMasteryLog() {
        // Only initialize masteryLogs once the summaryLog is initialized.
        if (!(this.summaryLogId || this.summaryLogId === null)) {
          let watchRevoke;
          watchRevoke = this.$watch('summaryLogId', () => {
            if ((this.summaryLogId || this.summaryLogId === null)) {
              this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime);
              watchRevoke();
            }
          });
        } else {
          this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime);
        }
      },
      initAttemptLog() {
        // Only initialize attemptLogs once the masteryLog is initialized.
        if (!(this.masteryLogId || this.masteryLogId === null)) {
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
      initAttemptLog() {
        this.initAttemptLogAction(this.Kolibri, this.itemId);
      },
    },
    vuex: {
      actions: {
        initMasteryLogAction: actions.initMasteryLog,
        saveMasteryLogAction: actions.saveMasteryLog,
        initAttemptLogAction: actions.initAttemptLog,
        saveAttemptLogAction: actions.saveAttemptLog,
        updateMasteryAttemptStateAction: actions.updateMasteryAttemptState,
      },
      getters: {
        summaryLogId: (state) => state.core.logging.summary.id,
        masteryLogId: (state) => state.core.logging.mastery.pk,
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

</style>
