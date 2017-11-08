<template>

  <div class="attempt-summary">
    <div class="column pure-u-3-4">
      <div class="user-name-container">
        <mat-svg
          class="svg-item"
          category="action"
          name="face"
        />
        <h1 class="user-name">{{ userName }}</h1>
      </div>
      <div class="exercise-name">
        <content-icon class="svg-icon" :kind="kind" />
        {{ exerciseTitle }}
      </div>
      <div :class="{'in-progress': !isCompleted, 'requirements': true}">
        <progress-icon class="svg-icon" :progress="summaryLog.progress" />
        {{ requirementsString }}
      </div>
    </div>
    <div class="column pure-u-1-4">
      <div class="status">
        <progress-icon class="svg-icon" :progress="summaryLog.progress" />
        <span v-if="isCompleted">
          <strong> {{ $tr('statusMastered') }} </strong>
          <br>
          <elapsed-time :date="dateCompleted" />
        </span>
        <span v-else-if="isCompleted !== null">
          <strong> {{ $tr('statusInProgress') }} </strong>
          <br>
          <elapsed-time :date="dateLastAttempted" />
        </span>
        <span v-else>
          <strong> {{ $tr('notStarted') }} </strong>
        </span>
      </div>
    </div>
  </div>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';
  export default {
    name: 'coachExercisePageStatus',
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
    height: 100%

  .user-name-container
    display: block

  .svg-icon
    font-size: 1.3em

  .exercise-name
    margin-top: 10px
    font-weight: bold

  .requirements
    margin-top: 10px

  .in-progress
    color: $core-grey

  .svg-item
    display: inline-block
    vertical-align: middle

  .user-name
    display: inline-block
    vertical-align: middle
    margin: 0

  .column
    float: left

  .status
    float: right
    text-align: right

</style>
