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
        @cleartask="returnToChannelsList()"
      />

      <template v-if="!taskInProgress && onDeviceInfoIsReady">
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
          v-if="transferredChannel && onDeviceInfoIsReady"
        >
          <div
            class="updates-available"
            v-if="newVersionAvailable"
          >
            <span>
              {{ $tr('newVersionAvailable', { version: transferredChannel.version }) }}
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
          :channel="transferredChannel"
          :channelOnDevice="channelOnDevice"
        />

        <ui-alert
          v-if="wizardStatus!==''"
          type="error"
          :dismissible="false"
        >
          {{ $tr('problemFetchingChannel') }}
        </ui-alert>

        <ui-alert
          v-if="contentTransferError"
          type="error"
          :dismissible="false"
        >
          {{ $tr('problemTransferringContents') }}
        </ui-alert>
        <!-- Contains size estimates + submit button -->
        <selected-resources-size
          v-if="availableSpace!==null"
          :mode="mode"
          :fileSize="nodeCounts.fileSize"
          :resourceCount="nodeCounts.resources"
          :spaceOnDrive="availableSpace"
          @clickconfirm="startContentTransfer()"
        />
        <hr>
        <content-tree-viewer />
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
    downloadChannelMetadata,
    transferChannelContent,
  } from '../../state/actions/contentTransferActions';
  import { setToolbarTitle } from '../../state/actions/manageContentActions';
  import taskProgress from '../manage-content-page/task-progress';
  import { ContentWizardErrors, TaskStatuses, TaskTypes } from '../../constants';
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
        return this.channelIsInstalled(this.transferredChannel.id) || {};
      },
      newVersionAvailable() {
        return this.transferredChannel.version > this.channelOnDevice.version;
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
        // turn progress bar off and refresh if update was cancelled
        if (this.showUpdateProgressBar && !val) {
          this.showUpdateProgressBar = false;
          this.refreshPage();
        }
      },
      transferredChannel(val) {
        if (val.name) {
          this.setToolbarTitle(this.$tr('selectContent', { channelName: val.name }));
        }
      },
    },
    mounted() {
      if (this.wholePageError) {
        this.setToolbarTitle(this.$tr('pageLoadError'));
      } else {
        this.setToolbarTitle(
          this.$tr('selectContent', { channelName: this.transferredChannel.name })
        );
      }
    },
    beforeDestroy() {
      this.cancelMetadataDownloadTask();
    },
    methods: {
      updateChannelMetadata() {
        // NOTE: This only updates the metadata, not the underlying content.
        // This could produced unexpected behavior for users.
        this.showUpdateProgressBar = true;
        return this.downloadChannelMetadata()
          .then(() => this.refreshPage())
          .catch(error => {
            if (error.errorType !== 'CHANNEL_TASK_ERROR') {
              this.contentTransferError = true;
            }
          });
      },
      startContentTransfer() {
        this.contentTransferError = false;
        return this.transferChannelContent()
          .then(() => {
            this.returnToChannelsList();
          })
          .catch(() => {
            this.contentTransferError = true;
          });
      },
      refreshPage() {
        this.$router.go(this.$router.currentRoute);
      },
      returnToChannelsList() {
        this.$router.push(manageContentPageLink());
      },
    },
    vuex: {
      getters: {
        availableSpace: state => wizardState(state).availableSpace,
        transferredChannel: state => wizardState(state).transferredChannel || {},
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
        setToolbarTitle,
        cancelMetadataDownloadTask(store) {
          const { taskList } = store.state.pageState;
          const task = find(taskList, { type: TaskTypes.REMOTECHANNELIMPORT });
          // TODO can remove this guard once cancelTask resolves even if Task is not there
          if (task) {
            return TaskResource.cancelTask(task.id);
          }
          return Promise.resolve();
        },
        downloadChannelMetadata,
        transferChannelContent,
      },
    },
    $trs: {
      channelUpToDate: 'Channel up-to-date',
      pageLoadError: 'There was a problem loading this page…',
      newVersionAvailable: 'Version {version, number} available',
      newVersionAvailableNotification:
        'New channel version available. Some of your files may be outdated or deleted.',
      problemFetchingChannel: 'There was a problem getting the contents of this channel',
      problemTransferringContents: 'There was a problem transferring the selected contents',
      selectContent: "Select content from '{channelName}'",
      update: 'Update',
    },
  };

</script>


<style lang="stylus" scoped>

  .updates
    text-align: right

</style>
