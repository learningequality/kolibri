<template>

  <div class="attempt-summary">
    <div class="pure-u-3-4">
      <div class="summary-item">
        <div class="icon">
          <mat-svg
            class="svg-item"
            category="action"
            name="face"
          />
        </div>
        <span class="user-name">
          {{ userName }}
        </span>
      </div>

      <div class="summary-item">
        <div class="icon">
          <content-icon
            class="svg-icon"
            :kind="kind"
          />
        </div>
        <span class="exercise-name">
          {{ exerciseTitle }}
        </span>
      </div>

      <div
        :class="{'in-progress': !isCompleted}"
        class="summary-item"
      >
        <div class="icon">
          <progress-icon
            class="svg-icon"
            :progress="summaryLog.progress"
          />
        </div>
        <span>
          {{ requirementsString }}
        </span>
      </div>

    </div>

    <div class="pure-u-1-4">
      <div class="status">
        <div class="status-text">
          <progress-icon
            class="svg-icon"
            :progress="summaryLog.progress"
          />
          <strong>{{ statusText }}</strong>
        </div>
        <div
          class="update-time"
          v-if="isCompleted || isCompleted !== null"
        >
          <elapsed-time :date="updateTime" />
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';

  export default {
    name: 'attemptSummary',
    $trs: {
      statusMastered: 'Completed',
      statusInProgress: 'In progress',
      requirementsMOfN: 'Completion: {m ,number} out of {n, number} correct',
      attemptDateIndicator: 'on { date }',
      notStarted: 'Not started',
    },
    components: {
      contentIcon,
      progressIcon,
      elapsedTime,
    },
    props: {
      userName: {
        type: String,
        required: true,
      },
      exerciseTitle: {
        type: String,
        required: true,
      },
      kind: {
        type: String,
        required: true,
      },
      summaryLog: {
        type: Object,
        default: () => ({}),
      },
    },
    computed: {
      isCompleted() {
        try {
          return this.summaryLog.currentmasterylog.complete;
        } catch (e) {
          if (e instanceof TypeError) {
            return null;
          }
          throw e;
        }
      },
      dateCompleted() {
        try {
          return new Date(this.summaryLog.currentmasterylog.end_timestamp);
        } catch (e) {
          if (e instanceof TypeError) {
            return null;
          }
          throw e;
        }
      },
      dateLastAttempted() {
        try {
          return new Date(this.summaryLog.end_timestamp);
        } catch (e) {
          if (e instanceof TypeError) {
            return null;
          }
          throw e;
        }
      },
      statusText() {
        if (this.isCompleted) {
          return this.$tr('statusMastered');
        } else if (this.isCompleted !== null) {
          return this.$tr('statusInProgress');
        } else {
          return this.$tr('notStarted');
        }
      },
      updateTime() {
        if (this.isCompleted) {
          return this.dateCompleted;
        } else if (this.isCompleted !== null) {
          return this.dateLastAttempted;
        } else {
          return null;
        }
      },
      requirementsString() {
        try {
          const requirements = this.summaryLog.currentmasterylog.mastery_criterion;
          // TODO might be more types?
          return this.$tr('requirementsMOfN', {
            m: requirements.m,
            n: requirements.n,
          });
        } catch (e) {
          if (e instanceof TypeError) {
            return null;
          }
          throw e;
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .attempt-summary
    background-color: $core-bg-light

  .user-name
    font-size: 24px
    font-weight: bold

  .exercise-name
    font-weight: bold

  .svg-icon
    font-size: 1.3em

  .in-progress
    color: $core-grey

  .svg-item
    display: inline-block
    vertical-align: middle

  .status
    text-align: right

  .icon
    display: inline-block
    margin-right: 16px
    width: 24px

  .summary-item
    margin: 8px 0
    vertical-align: baseline
    span
      vertical-align: inherit

  .status-text
    margin-top: 8px
    .svg-icon
      margin-right: 8px

  .update-time
    padding: 4px 0
    font-size: 12px

</style>
