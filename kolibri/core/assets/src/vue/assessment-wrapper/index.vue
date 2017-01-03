<!--
This template is intended to act as the default wrapper for assessment focused rendering
plugins.

As such, it provides display of current mastery progress, and manages all mastery/attempt log
oriented data synchronization.
-->


<template v-if="ready">

  <div>
    <slot/>
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
      // Once the data for the overall assessment is loaded in the renderer
      // we can initialize the mastery log, as the mastery model and spacing time
      // will be available.
      if (this.isFacilityUser) {
        this.initMasteryLog();
      } else {
        // if userKind is anonymous user or deviceOwner.
        this.createDummyMasteryLogAction(this.Kolibri);
      }

      this.$on('updateAMLogs', (correct, complete, firstAttempt, hinted) => {
        this.updateAttemptLogMasteryLog(correct, complete, firstAttempt, hinted);
      });
      this.$on('saveAMLogs', (exercisePassed) => { this.saveAttemptLogMasterLog(exercisePassed);});
      this.$on('takehint', (firstAttempt, hinted) => { this.hintTaken(firstAttempt, hinted);});
      this.$on('toNextQuestion', () => { this.nextQuestion();});

      this.createAttemptLog().then(() => {
        this.ready = true;
      });
    },
    methods: {
      updateAttemptLogMasteryLog(correct, complete, firstAttempt, hinted) {
        this.updateMasteryAttemptStateAction(new Date(), correct, complete, firstAttempt, hinted);
      },
      saveAttemptLogMasterLog(exercisePassed) {
        this.saveAttemptLogAction(this.Kolibri).then(() => {
          if (this.isFacilityUser && exercisePassed) {
            this.setMasteryLogCompleteAction(new Date());
            this.saveMasteryLogAction(this.Kolibri);
          }
        });
      },
      hintTaken(firstAttempt, hinted) {
        this.updateAttemptLogInteractionHistoryAction(InteractionTypes.hint);
        if (firstAttempt) {
          // mark the attemptlog as hinted only if the first attempt is taking the hint.
          this.updateAttemptLogMasteryLog(0, false, firstAttempt, hinted);
        }
        this.saveAttemptLogMasterLog(false);
      },
      nextQuestion() {
        this.createAttemptLog().then(() => {
          this.ready = true;
          this.$emit('nextquestion');
        });
      },
      initMasteryLog() {
        this.initMasteryLogAction(this.Kolibri, this.masterySpacingTime, this.masteryCriterion);
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
      isFacilityUser() {
        return !(this.userkind.includes(UserKinds.SUPERUSER) ||
          this.userkind.includes(UserKinds.ANONYMOUS));
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
        userkind: (state) => state.core.session.kind,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
