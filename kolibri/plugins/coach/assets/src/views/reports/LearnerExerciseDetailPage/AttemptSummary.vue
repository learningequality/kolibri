<template>

  <KGrid :style="{ backgroundColor: $coreBgLight }">
    <KGridItem size="75" percentage>
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
          <ContentIcon
            class="svg-icon"
            :kind="kind"
          />
        </div>
        <span class="exercise-name">
          {{ exerciseTitle }}
        </span>
      </div>

      <div
        :style="{ color: !isCompleted ? $coreGrey : '' }"
        class="summary-item"
      >
        <div class="icon">
          <ProgressIcon
            class="svg-icon"
            :progress="summaryLog.progress"
          />
        </div>
        <span>
          {{ requirementsString }}
        </span>
      </div>

    </KGridItem>

    <KGridItem size="25" percentage>
      <div class="status">
        <div class="status-text">
          <ProgressIcon
            class="svg-icon"
            :progress="summaryLog.progress"
          />
          <strong>{{ statusText }}</strong>
        </div>
        <div
          v-if="isCompleted || isCompleted !== null"
          class="update-time"
        >
          <ElapsedTime :date="updateTime" />
        </div>
      </div>
    </KGridItem>
  </KGrid>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'AttemptSummary',
    $trs: {
      statusMastered: 'Completed',
      statusInProgress: 'In progress',
      requirementsMOfN: 'Completion: {m ,number} out of {n, number} correct',
      attemptDateIndicator: 'on { date }',
      notStarted: 'Not started',
    },
    components: {
      ContentIcon,
      ProgressIcon,
      ElapsedTime,
      KGrid,
      KGridItem,
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
      ...mapGetters(['$coreGrey', '$coreBgLight']),
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


<style lang="scss" scoped>

  .user-name {
    font-size: 24px;
    font-weight: bold;
  }

  .exercise-name {
    font-weight: bold;
  }

  .svg-icon {
    font-size: 1.3em;
  }

  .svg-item {
    display: inline-block;
    vertical-align: middle;
  }

  .status {
    text-align: right;
  }

  .icon {
    display: inline-block;
    width: 24px;
    margin-right: 16px;
  }

  .summary-item {
    margin: 8px 0;
    vertical-align: baseline;
    span {
      vertical-align: inherit;
    }
  }

  .status-text {
    margin-top: 8px;
    .svg-icon {
      margin-right: 8px;
    }
  }

  .update-time {
    padding: 4px 0;
    font-size: 12px;
  }

</style>
