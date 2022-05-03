<template>

  <transition name="fade">
    <div v-if="$attrs.show" class="task-progress">
      <div class="dtc progress-icon">
        <transition name="fade" mode="out-in">
          <KIcon
            v-if="taskHasFailed"
            icon="error"
            :color="$themeTokens.error"
          />
          <KIcon
            v-else-if="taskHasCompleted"
            icon="correct"
            :color="$themeTokens.success"
          />
          <KCircularLoader
            v-else
            class="inprogress"
            :delay="false"
          />
        </transition>
      </div>

      <div class="dtc progress-bar">
        <div :class="{ 'task-stage': !taskHasCompleted }">
          {{ stageText }}
        </div>
        <KLinearLoader
          v-if="!taskHasCompleted"
          :type="taskIsPreparing ? 'indeterminate' : 'determinate'"
          :progress="formattedPercentage"
          :delay="false"
        />
      </div>

      <div v-if="!taskHasCompleted" class="dtc progress-messages">
        <span class="percentage">{{ progressMessage }}</span>
      </div>

    </div>
  </transition>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskStatuses } from '../../constants';

  export default {
    name: 'TaskProgress',
    mixins: [commonCoreStrings],
    props: {
      status: {
        type: String,
        default: null,
      },
      percentage: {
        type: Number,
        default: null,
      },
    },
    computed: {
      TaskStatuses: () => TaskStatuses,
      stageText() {
        return this.$tr('downloadingChannelContents');
      },
      taskHasFailed() {
        return this.status === this.TaskStatuses.FAILED;
      },
      taskHasCompleted() {
        return this.status === this.TaskStatuses.COMPLETED;
      },
      taskIsPreparing() {
        return (
          this.status === this.TaskStatuses.QUEUED || this.status === this.TaskStatuses.SCHEDULED
        );
      },
      formattedPercentage() {
        return this.percentage * 100;
      },
      progressMessage() {
        if (this.percentage > 0) {
          return this.formattedPercentage.toFixed(2) + '%';
        }
        return '';
      },
    },
    $trs: {
      downloadingChannelContents: {
        message: 'Generating channel listing. This could take a few minutes',
        context:
          'Text in the task manager panel indicating that a channel listing is being created.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-icon {
    position: relative;
    top: -2px;
    width: 5%;
    text-align: center;

    .inprogress {
      display: inline-block;
    }
  }

  .task-progress {
    display: table;
    width: 100%;
    height: 5em;
    margin-left: -6px;
    vertical-align: middle;
  }

  .task-stage {
    margin-bottom: 0.5em;
  }

  .progress-bar {
    width: 50%;
    padding-bottom: 8px;
    padding-left: 8px;
    font-size: 0.75em;
  }

  .progress-messages {
    padding-left: 16px;
  }

  .percentage {
    font-weight: bold;
  }

  .buttons {
    text-align: right;
  }

  .dtc {
    display: table-cell;
    vertical-align: inherit;
  }

  .btn {
    margin: 0;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s;
  }

</style>
