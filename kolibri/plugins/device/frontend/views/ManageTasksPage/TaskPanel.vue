<template>

  <div
    class="task-panel"
    :class="{ 'task-panel-sm': windowIsSmall }"
  >
    <div class="icon">
      <transition mode="out-in">
        <KIcon
          v-if="taskIsFailed"
          icon="helpNeeded"
          :style="{ fill: $themeTokens.error }"
        />
        <KIcon
          v-else-if="taskIsCompleted"
          icon="done"
          :style="{ fill: $themeTokens.success }"
        />
        <KCircularLoader
          v-else-if="taskIsRunning"
          :size="24"
          :stroke="5"
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
        {{ statusText }}
      </p>
      <h2 class="details-description">
        {{ descriptionText }}
      </h2>
      <div
        v-if="taskIsRunning || taskIsCanceling"
        class="details-progress-bar"
      >
        <template v-if="taskIsRunning">
          <KLinearLoader
            class="k-linear-loader"
            :type="loaderType"
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
        <template v-else-if="taskIsCanceling">
          <KLinearLoader
            class="k-linear-loader"
            type="indeterminate"
            :delay="false"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          />
        </template>
      </div>
      <template v-if="!taskIsCompleted">
        <p
          v-if="sizeText"
          class="details-size"
        >
          {{ sizeText }}
        </p>
      </template>
      <template v-else>
        <p
          v-if="finishedSizeText"
          class="details-size"
        >
          {{ finishedSizeText }}
        </p>
      </template>
      <p
        class="details-startedby"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ startedByText }}
      </p>
    </div>

    <KButtonGroup
      class="buttons"
      :class="{ 'button-lift': taskIsRunning }"
    >
      <KButton
        v-if="taskIsFailed"
        :text="coreString('retryAction')"
        appearance="flat-button"
        @click="$emit('restart')"
      />
      <KButton
        v-if="taskIsCancellable || taskIsClearable"
        :disabled="taskIsCanceling"
        :text="buttonLabel"
        appearance="flat-button"
        @click="handleClick"
      />
    </KButtonGroup>
  </div>

</template>


<script>

  // Displays a single Task and its metadata, and provides buttons
  // to cancel or clear it.

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';

  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import commonDeviceStrings from '../commonDeviceStrings';

  const typeToTrMap = {
    [TaskTypes.REMOTECONTENTIMPORT]: 'importChannelPartial',
    [TaskTypes.DISKCONTENTIMPORT]: 'importChannelPartial',
    [TaskTypes.REMOTEIMPORT]: 'importChannelWhole',
    [TaskTypes.DISKIMPORT]: 'importChannelWhole',
    [TaskTypes.DISKEXPORT]: 'exportChannelWhole',
    [TaskTypes.DISKCONTENTEXPORT]: 'exportChannelPartial',
    [TaskTypes.DELETECHANNEL]: 'deleteChannelWhole',
    [TaskTypes.DELETECONTENT]: 'deleteChannelPartial',
    [TaskTypes.UPDATECHANNEL]: 'updatingChannelVersion',
  };

  const typeToTrPrefixMap = {
    [TaskTypes.REMOTECONTENTIMPORT]: 'import',
    [TaskTypes.DISKCONTENTIMPORT]: 'import',
    [TaskTypes.UPDATECHANNEL]: 'import',
    [TaskTypes.REMOTEIMPORT]: 'import',
    [TaskTypes.DISKIMPORT]: 'import',
    [TaskTypes.DISKEXPORT]: 'export',
    [TaskTypes.DISKCONTENTEXPORT]: 'export',
    [TaskTypes.DELETECHANNEL]: 'delete',
    [TaskTypes.DELETECONTENT]: 'delete',
  };

  const statusToTrMap = {
    [TaskStatuses.COMPLETED]: 'statusComplete',
    [TaskStatuses.FAILED]: 'statusFailed',
    [TaskStatuses.RUNNING]: 'statusInProgress',
    [TaskStatuses.QUEUED]: 'statusInQueue',
    [TaskStatuses.CANCELED]: 'statusCanceled',
    [TaskStatuses.CANCELING]: 'statusCanceling',
  };

  export default {
    name: 'TaskPanel',
    mixins: [commonCoreStrings, commonDeviceStrings],
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
    },
    computed: {
      buttonLabel() {
        if (this.taskIsClearable) {
          return this.coreString('clearAction');
        }
        return this.coreString('cancelAction');
      },
      taskIsRunning() {
        return this.task.status === TaskStatuses.RUNNING;
      },
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
      taskIsCancellable() {
        return this.task.cancellable;
      },
      taskIsClearable() {
        return this.task.clearable;
      },
      taskPercentage() {
        return this.task.percentage;
      },
      loaderType() {
        // Show an indeterminate loader while bulk import is still in pre-importcontent step.
        if (this.taskPercentage === null) {
          return 'indeterminate';
        }
        return 'determinate';
      },
      descriptionText() {
        const trName = typeToTrMap[this.task.type];
        return this.$tr(trName, {
          channelName: this.task.extra_metadata.channel_name || this.$tr('unknownChannelName'),
          newVersion: this.task.extra_metadata.new_version,
        });
      },
      sizeText() {
        const { file_size, total_resources } = this.task.extra_metadata;
        if (file_size && total_resources) {
          return this.$tr('numResourcesAndSize', {
            numResources: total_resources,
            bytesText: bytesForHumans(file_size),
          });
        } else if (file_size) {
          return this.$tr('cancelSize', {
            bytesText: bytesForHumans(file_size),
          });
        } else if (
          this.task.type === TaskTypes.DELETECHANNEL ||
          this.task.type === TaskTypes.DELETECONTENT
        ) {
          return this.$tr('deletePreparing', {
            channelName: this.task.extra_metadata.channel_name || this.$tr('unknownChannelName'),
          });
        }
        return '';
      },
      finishedSizeText() {
        const { transferred_file_size, transferred_resources, file_size, total_resources } =
          this.task.extra_metadata;
        // Special case for canceled exports
        if (
          (this.task.type === TaskTypes.DISKEXPORT ||
            this.task.type === TaskTypes.DISKCONTENTEXPORT) &&
          this.task.status === TaskStatuses.CANCELED
        ) {
          return '';
        }
        if (file_size && total_resources) {
          const trPrefix = typeToTrPrefixMap[this.task.type];
          if (
            transferred_file_size &&
            transferred_resources &&
            (transferred_file_size < file_size || transferred_resources < total_resources)
          ) {
            return this.$tr(`${trPrefix}PartialRatio`, {
              currentResources: transferred_resources,
              totalResources: total_resources,
              currentSize: bytesForHumans(transferred_file_size),
              totalSize: bytesForHumans(file_size),
            });
          } else {
            return this.$tr(`${trPrefix}Success`, {
              totalResources: total_resources,
              totalSize: bytesForHumans(file_size),
            });
          }
        }
        return '';
      },
      statusText() {
        const trName = statusToTrMap[this.task.status];
        return this.deviceString(trName);
      },
      startedByText() {
        return this.$tr('startedByUser', {
          user: this.task.extra_metadata.started_by_username || this.$tr('unknownUsername'),
        });
      },
    },

    methods: {
      handleClick() {
        if (this.taskIsCompleted || this.taskIsFailed) {
          this.$emit('clickclear');
        } else {
          this.$emit('clickcancel');
        }
      },
    },
    $trs: {
      startedByUser: {
        message: "Started by '{user}'",
        context: 'Refers to the content management *task*.',
      },
      numResourcesAndSize: {
        message:
          '{numResources} {numResources, plural, one {resource} other {resources}} ({bytesText})',
        context: 'Indicates the number of resources and their size.',
      },
      cancelSize: {
        message: 'Exported size: ({bytesText})',
        context: 'Indicates the number of resources and their size.',
      },
      importChannelWhole: {
        message: `Import '{channelName}'`,
        context:
          "Indicates the user is importing an entire channel. For example:\n\n'Import 'Ubongo Kids''",
      },
      importChannelPartial: {
        message: `Import resources from '{channelName}'`,
        context:
          'Indicates the user is importing a selection of resources from a specific channel.\n',
      },
      exportChannelWhole: {
        message: `Export '{channelName}'`,
        context: 'Indicates the user is exporting an entire channel.',
      },
      exportChannelPartial: {
        message: `Export resources from '{channelName}'`,
        context:
          'Indicates the user is exporting a selection of resources from a specific channel.',
      },
      deleteChannelWhole: {
        message: `Delete '{channelName}'`,
        context: 'Refers to deleting an entire channel.',
      },
      deletePreparing: {
        message: `Preparing to delete resources for '{channelName}'`,
        context: 'Indicates that deletion has started but no status can be reported yet.',
      },
      deleteChannelPartial: {
        message: `Delete resources from '{channelName}'`,
        context: 'Indicates the channel from which resources will be deleted.',
      },
      updatingChannelVersion: {
        message: `Update {channelName} to version {newVersion}`,
        context: 'Refers to a task where a channel is updated to a new version.',
      },
      // Catch-all strings if the channel or username doesn't get attached to Task
      unknownUsername: {
        message: 'Unknown user',
        context: 'Displays if the name of the user carrying out a specific task is not known.',
      },
      unknownChannelName: {
        message: '(Channel name unavailable)',
        context: 'This displays if Kolibri is unable to recognize the name of the channel.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      // stubs
      stopAction: {
        message: 'Stop',
        context: 'Button to stop a task from executing.',
      },
      importPartialRatio: {
        message:
          '{currentResources} of {totalResources} {totalResources, plural, one {resource} other {resources}} ({currentSize} of {totalSize}) imported',
        context:
          "Indicates how many resources are being imported out of the total resources available on that specific channel and the size of the resources. For example:\n\n'718 of 742 resources (22 GB of 22 GB) imported'",
      },
      exportPartialRatio: {
        message:
          '{currentResources} of {totalResources} {totalResources, plural, one {resource} other {resources}} ({currentSize} of {totalSize}) exported',
        context:
          "Indicates how many resources are being exported out of the total resources available on that specific channel, and the size of the resources. For example:\n\n'7 of 10 resources (22 GB of 22 GB) exported'",
      },
      deletePartialRatio: {
        message:
          '{currentResources} of {totalResources} {totalResources, plural, one {resource} other {resources}} ({currentSize} of {totalSize}) deleted',
        context:
          "Indicates how many resources are being deleted out of the total resources available on that specific channel. For example:\n\n'10 of 20 resources deleted'",
      },
      importSuccess: {
        message:
          '{totalResources} {totalResources, plural, one {resource} other {resources}} ({totalSize}) successfully imported',
        context:
          "Indicates the successful import of a specified number of resources. For example:\n\n'4752 resources (29 GB) successfully imported'",
      },
      exportSuccess: {
        message:
          '{totalResources} {totalResources, plural, one {resource} other {resources}} ({totalSize}) successfully exported',
        context:
          "Indicates the successful export of a specified number of resources.\n\n'7 of 10 resources successfully exported'",
      },
      deleteSuccess: {
        message:
          '{totalResources} {totalResources, plural, one {resource} other {resources}} ({totalSize}) successfully deleted',
        context:
          "Indicates the successful deletion of a specified number of resources. For example:\n\n'976 resources (178 MB) successfully deleted'",
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
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

  .details-startedby {
    font-size: $fs0;
  }

  .buttons {
    display: flex;

    .task-panel-sm & {
      align-self: flex-end;
    }
  }

  .buttons-lift {
    // Lift button a little to align with progress bar
    margin-top: -24px;
  }

</style>
