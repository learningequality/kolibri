<template>

  <div>
    <content-wizard-ui-alert
      v-if="wholePageError"
      :errorType="wholePageError"
    />

    <template v-else>
      <task-progress
        v-if="showUpdateProgressBar"
        type="UPDATING_CHANNEL"
        status="QUEUED"
        :percentage="0"
        :showButtons="true"
        :cancellable="true"
        @cleartask="cancelMetadataDownloadTask()"
        id="updatingchannel"
      />
      <task-progress
        v-else-if="metadataDownloadTask"
        type="DOWNLOADING_CHANNEL_CONTENTS"
        v-bind="metadataDownloadTask"
        :showButtons="true"
        :cancellable="true"
        @cleartask="cancelMetadataDownloadAndExit()"
      />

      <section class="notifications">
        <ui-alert
          v-if="newVersionAvailable"
          type="info"
          :removeIcon="true"
          :dismissible="false"
        >
          {{ $tr('newVersionAvailableNotification') }}
        </ui-alert>
      </section>

      <section
        class="updates"
        v-if="channel && onDeviceInfoIsReady"
      >
        <div
          class="updates-available"
          v-if="newVersionAvailable"
        >
          <span>
            {{ $tr('newVersionAvailable', { version: channel.version }) }}
          </span>
          <k-button
            :text="$tr('update')"
            :primary="true"
            name="update"
            @click="updateChannelMetadata()"
          />
        </div>
        <span v-else>{{ $tr('channelUpToDate') }}</span>
      </section>

      <channel-contents-summary
        v-if="onDeviceInfoIsReady && !taskInProgress"
        :channel="channel"
        :channelOnDevice="channelOnDevice"
      />

      <!-- Assuming that if wizardState.status is truthy, it's an error -->
      <ui-alert
        v-if="wizardStatus!==''"
        type="error"
        :dismissible="false"
      >
        {{ $tr('problemFetchingChannel') }}
      </ui-alert>

      <template v-if="onDeviceInfoIsReady">
        <ui-alert
          v-if="contentTransferError"
          type="error"
          :dismissible="false"
        >
          {{ $tr('problemTransferringContents') }}
        </ui-alert>
        <!-- Contains size estimates + submit button -->
        <selected-resources-size
          :mode="mode"
          :fileSize="nodeCounts.fileSize"
          :resourceCount="nodeCounts.resources"
          :spaceOnDrive="availableSpace"
          @clickconfirm="startTransferringContent()"
        />
        <hr>
        <content-tree-viewer v-if="!taskInProgress" />
      </template>
    </template>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { TaskResource } from 'kolibri.resources';
  import isEmpty from 'lodash/isEmpty';
  import find from 'lodash/find';
  import subpageContainer from '../containers/subpage-container';
  import { channelIsInstalled, wizardState, nodeTransferCounts } from '../../state/getters';
  import {
    getAvailableSpaceOnDrive,
    updateTreeViewTopic,
  } from '../../state/actions/selectContentActions';
  import {
    downloadChannelMetadata,
    transferChannelContent,
    waitForTaskToComplete,
  } from '../../state/actions/contentTransferActions';
  import { ContentWizardErrors } from '../../state/actions/contentWizardActions';
  import taskProgress from '../manage-content-page/task-progress';
  import { TaskStatuses, TaskTypes } from '../../constants';
  import { manageContentPageLink } from '../manage-content-page/manageContentLinks';
  import channelContentsSummary from './channel-contents-summary';
  import contentTreeViewer from './content-tree-viewer';
  import selectedResourcesSize from './selected-resources-size';
  import contentWizardUiAlert from './content-wizard-ui-alert';

  export default {
    name: 'selectContentPage',
    components: {
      channelContentsSummary,
      contentTreeViewer,
      contentWizardUiAlert,
      immersiveFullScreen,
      kButton,
      selectedResourcesSize,
      subpageContainer,
      taskProgress,
      uiAlert,
    },
    data() {
      return {
        showUpdateProgressBar: false,
        contentTransferError: false,
      };
    },
    computed: {
      metadataDownloadTask() {
        return find(this.taskList, { type: TaskTypes.REMOTECHANNELIMPORT });
      },
      contentDownloadTask() {
        return find(this.taskList, { type: TaskTypes.REMOTECONTENTIMPORT });
      },
      // If this property is truthy, the entire UI is hidden and only the UiAlert is shown
      wholePageError() {
        // Show error if a Channel Transfer is in progress
        if (this.contentDownloadTask) {
          return ContentWizardErrors.TRANSFER_IN_PROGRESS;
        }
        // Show errors thrown during data fetching
        if (Object.values(ContentWizardErrors).includes(this.wizardStatus)) {
          return this.wizardStatus;
        }
      },
      channelOnDevice() {
        return this.channelIsInstalled(this.channel.id) || {};
      },
      newVersionAvailable() {
        return this.channel.version > this.channelOnDevice.version;
      },
      taskInProgress() {
        return this.firstTask && this.firstTask.status !== TaskStatuses.COMPLETED;
      },
      nodeCounts() {
        return this.nodeTransferCounts(this.transferType);
      },
    },
    watch: {
      metadataDownloadTask(val) {
        // turn progress bar off if update was cancelled
        if (this.showUpdateProgressBar && !val) {
          this.showUpdateProgressBar = false;
          // Force refresh just in case it finished before cancelling -> get latest data
          this.$router.go(this.$router.currentRoute);
        }
      },
    },
    beforeMount() {
      this.setToolbarTitle(this.$tr('selectContent'));
    },
    mounted() {
      this.getAvailableSpaceOnDrive();
    },
    beforeDestroy() {
      this.cancelMetadataDownloadTask();
    },
    methods: {
      cancelMetadataDownloadTask() {
        if (this.metadataDownloadTask) {
          return TaskResource.cancelTask(this.metadataDownloadTask.id);
        }
      },
      cancelMetadataDownloadAndExit() {
        this.cancelMetadataDownloadTask().then(() => this.returnToChannelsList());
      },
      updateChannelMetadata() {
        // NOTE: This only updates the metadata, not the underlying content.
        // This could produced unexpected behavior for users.
        this.showUpdateProgressBar = true;
        return this.downloadChannelMetadata()
          .then(() => {
            this.$router.go(this.$router.currentRoute);
          })
          .catch(error => {
            if (error.errorType !== 'CHANNEL_TASK_ERROR') {
              this.contentTransferError = true;
            }
          });
      },
      startTransferringContent() {
        this.contentTransferError = false;
        return this.transferChannelContent()
          .then(() => {
            this.returnToChannelsList();
          })
          .catch(() => {
            this.contentTransferError = true;
          });
      },
      returnToChannelsList() {
        this.$router.push(manageContentPageLink());
      },
    },
    vuex: {
      getters: {
        availableSpace: state => wizardState(state).availableSpace || 0,
        channel: state => wizardState(state).transferredChannel || {},
        channelIsInstalled,
        databaseIsLoading: ({ pageState }) => pageState.databaseIsLoading,
        firstTask: ({ pageState }) => pageState.taskList[0],
        taskList: ({ pageState }) => pageState.taskList,
        mode: state => (wizardState(state).transferType === 'localexport' ? 'export' : 'import'),
        nodeTransferCounts,
        onDeviceInfoIsReady: state => !isEmpty(wizardState(state).currentTopicNode),
        selectedItems: state => wizardState(state).nodesForTransfer || {},
        transferType: state => wizardState(state).transferType,
        wizardStatus: state => wizardState(state).status,
        topicNode: state => wizardState(state).currentTopicNode,
      },
      actions: {
        setToolbarTitle(store, newTitle) {
          store.dispatch('SET_TOOLBAR_TITLE', newTitle);
        },
        downloadChannelMetadata,
        getAvailableSpaceOnDrive,
        transferChannelContent,
        waitForTaskToComplete,
        updateTreeViewTopic,
      },
    },
    $trs: {
      channelUpToDate: 'Channel up-to-date',
      newVersionAvailable: 'Version {version, number} available',
      newVersionAvailableNotification:
        'New channel version available. Some of your files may be outdated or deleted.',
      problemFetchingChannel: 'There was a problem getting the contents of this channel',
      problemTransferringContents: 'There was a problem transferring the selected contents',
      selectContent: 'Select content',
      update: 'Update',
    },
  };

</script>


<style lang="stylus" scoped>

  .updates
    text-align: right

</style>
