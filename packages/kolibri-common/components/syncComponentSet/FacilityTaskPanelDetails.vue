<template>

  <div
    class="task-panel"
    :class="{ 'task-panel-sm': windowIsSmall }"
  >
    <div class="icon">
      <transition mode="out-in">
        <KCircularLoader
          v-if="showCircularLoader || taskIsCanceling"
          :size="24"
          :stroke="5"
        />
        <KIcon
          v-else-if="taskIsFailed"
          icon="helpNeeded"
          :style="{ fill: $themeTokens.error }"
        />
        <KIcon
          v-else-if="taskIsCompleted"
          icon="done"
          :style="{ fill: $themeTokens.success }"
        />
        <KIcon
          v-else
          icon="inProgress"
          :style="{ fill: $themeTokens.annotation }"
        />
      </transition>
    </div>

    <div class="details">
      <p
        class="details-status"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ statusMsg }}
      </p>

      <h2
        v-if="headingMsg"
        class="details-description"
      >
        {{ headingMsg }}
      </h2>

      <p
        v-if="underHeadingMsg"
        class="fs0"
      >
        {{ underHeadingMsg }}
      </p>

      <div
        v-if="loaderType && !statusHidesLoader"
        class="details-progress-bar"
      >
        <template v-if="loaderType === 'determinate'">
          <KLinearLoader
            class="k-linear-loader"
            type="determinate"
            :delay="false"
            :progress="task.percentage * 100"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          />
          <span
            v-if="taskPercentage"
            class="details-percentage"
          >
            {{ $formatNumber(taskPercentage, { style: 'percent' }) }}
          </span>
        </template>

        <template v-else-if="loaderType === 'indeterminate'">
          <KLinearLoader
            class="k-linear-loader"
            type="indeterminate"
            :delay="false"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          />
        </template>
      </div>

      <p
        v-if="underProgressMsg"
        class="fs0"
      >
        {{ underProgressMsg }}
      </p>

      <p
        v-if="startedByMsg"
        class="fs0"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ startedByMsg }}
      </p>
    </div>

    <KButtonGroup
      v-if="buttonSet"
      class="nowrap"
      :class="{ 'button-lift': Boolean(loaderType) }"
    >
      <KButton
        v-if="buttonSet === 'cancel'"
        :disabled="taskIsCanceling"
        :text="coreString('cancelAction')"
        appearance="flat-button"
        @click="$emit('cancel')"
      />
      <KButton
        v-if="buttonSet === 'clear' || buttonSet === 'retry'"
        :text="coreString('clearAction')"
        appearance="flat-button"
        @click="$emit('clear')"
      />
      <KButton
        v-if="buttonSet === 'retry'"
        :text="coreString('retryAction')"
        appearance="raised-button"
        primary
        @click="$emit('retry')"
      />
    </KButtonGroup>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonTaskStrings from 'kolibri-common/uiText/tasks';
  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';

  export default {
    name: 'FacilityTaskPanelDetails',
    mixins: [commonCoreStrings, commonTaskStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      task: {
        type: Object,
        required: true,
      },
      statusMsg: {
        type: String,
        required: true,
      },
      headingMsg: {
        type: String,
        required: true,
      },
      underHeadingMsg: {
        type: String,
        default: null,
      },
      underProgressMsg: {
        type: String,
        default: null,
      },
      showCircularLoader: {
        type: Boolean,
        default: false,
      },
      loaderType: {
        type: String,
        default: null,
        validator(value) {
          return value === 'determinate' || value === 'indeterminate';
        },
      },
      buttonSet: {
        type: String,
        default: null,
        validator(value) {
          return value === '' || value === 'clear' || value === 'cancel' || value === 'retry';
        },
      },
    },
    computed: {
      taskIsCompleted() {
        return this.task.status === TaskStatuses.COMPLETED;
      },
      taskIsCanceling() {
        return this.task.status === TaskStatuses.CANCELING;
      },
      taskIsCanceled() {
        return this.task.status === TaskStatuses.CANCELED;
      },
      taskIsFailed() {
        return this.task.status === TaskStatuses.FAILED || this.taskIsCanceled;
      },
      taskPercentage() {
        return this.task.percentage;
      },
      startedByMsg() {
        if (!this.task.started_by_username) {
          return '';
        }

        if (this.task.type === TaskTypes.SYNCLOD)
          if (this.task.status === TaskStatuses.COMPLETED)
            return this.getTaskString('taskLODFinishedByLabel', {
              fullname: this.task.full_name,
              facilityname: this.task.facility_name,
            });
          else return '';
        else
          return this.getTaskString('taskStartedByLabel', {
            username: this.task.started_by_username || this.getTaskString('unknownUsername'),
          });
      },
      statusHidesLoader() {
        return (
          this.task.status === TaskStatuses.PENDING ||
          this.taskIsCompleted ||
          this.taskIsCanceling ||
          this.taskIsFailed
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  $fs0: 12px;
  $fs1: 14px;
  $fs2: 16px;

  p,
  h2 {
    margin: 8px 0;
  }

  .icon {
    padding: 0 16px;

    .task-panel-sm & {
      align-self: flex-start;
    }
  }

  .icon svg {
    width: 24px;
    height: 24px;
  }

  .task-panel {
    display: flex;
    align-items: center;
  }

  .task-panel-sm {
    flex-direction: column;
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .details {
    flex-grow: 1;
    width: 100%;
    padding: 16px;

    .task-panel-sm & {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .details-description {
    font-size: $fs2;
  }

  .details-progress-bar {
    display: flex;
    align-items: center;
    max-width: 450px;
    margin-bottom: 16px;
  }

  // CSS overrides for linear loader
  .k-linear-loader {
    height: 10px;

    /deep/ .ui-progress-linear-progress-bar {
      height: 100%;
    }
  }

  .details-percentage {
    // min-width ensures num % stay on same line
    min-width: 48px;
    margin-left: 16px;
    font-size: $fs1;
  }

  .details-status {
    font-size: $fs0;
  }

  .details-size {
    font-size: $fs1;
  }

  .fs0 {
    font-size: $fs0;
  }

  .buttons {
    .task-panel-sm & {
      align-self: flex-end;
    }
  }

  .buttons-lift {
    // Lift button a little to align with progress bar
    margin-top: -24px;
  }

  .nowrap {
    white-space: nowrap;
  }

</style>
