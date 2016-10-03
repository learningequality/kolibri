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
      masteryModel: {
        type: String,
      },
      masterySpacingTime: {
        type: Number,
      },
    },
    created() {
      this.$parent.$once('assessmentDataLoaded', initMasteryLog);
      // Once the data for the overall assessment is loaded in the renderer
      // we can initialize the mastery log, as the mastery model and spacing time
      // will be available.
      this.$parent.$once('itemIdSet', initAttemptLog);
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
          let watchRevoke;
          watchRevoke = this.$watch('masteryLogId', () => {
            if ((this.masteryLogId || this.masteryLogId === null)) {
              this.initAttemptLogAction(this.Kolibri, this.itemId);
              watchRevoke();
            }
          });
        } else {
          this.initAttemptLogAction(this.Kolibri, this.itemId);
        }
      }
    }
    vuex: {
      actions: {
        initMasteryLogAction: actions.initMasteryLog,
        initAttemptLogAction: actions.initAttemptLog,
      },
      getters: {
        summaryLogId: (state) => state.core.logging.summary.id,
        masteryLogId: (state) => state.core.logging.mastery.id,
        totalattempts: (state) => state.core.logging.mastery.totalattempts,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

</style>
