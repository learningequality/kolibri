<template>

  <div>
    <content-wizard-ui-alert
      v-if="wizardStatus"
      :errorType="wizardStatus"
    />

    <template v-else>
      <task-progress
        v-if="showUpdateProgressBar"
        type="UPDATING_CHANNEL"
        status="QUEUED"
        :percentage="0"
        :showButtons="true"
        :cancellable="true"
        @cleartask="returnToChannelsList"
        id="updatingchannel"
      />
      <task-progress
        v-else-if="taskInProgress"
        type="DOWNLOADING_CHANNEL_CONTENTS"
        v-bind="firstTask"
        :showButtons="true"
        :cancellable="true"
        @cleartask="returnToChannelsList"
      />

      <section class="notifications">
        <ui-alert
          v-if="!wizardStatus && newVersionAvailable"
          type="info"
          :removeIcon="true"
          :dismissible="false"
        >
          {{ $tr('newVersionAvailableNotification') }}
        </ui-alert>
      </section>

      <section v-if="onDeviceInfoIsReady" class="updates">
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
        v-if="!taskInProgress"
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
        <content-tree-viewer />
      </template>
    </template>
  </div>

</template>


<script>

  import uniqBy from 'lodash/uniqBy';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { TaskResource } from 'kolibri.resources';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import uiAlert from 'keen-ui/src/UiAlert';
  import isEmpty from 'lodash/isEmpty';
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
  import taskProgress from '../manage-content-page/task-progress';
  import { TaskStatuses } from '../../constants';
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
      channelOnDevice() {
        const installedChannel = this.channelIsInstalled(this.channel.id);
        return (
          installedChannel || {
            on_device_file_size: 0,
            on_device_resources: 0,
          }
        );
      },
      newVersionAvailable() {
        if (this.channelOnDevice.version) {
          return this.channel.version > this.channelOnDevice.version;
        }
        return false;
      },
      taskInProgress() {
        return this.firstTask && this.firstTask.status !== TaskStatuses.COMPLETED;
      },
      nodeCounts() {
        return this.nodeTransferCounts(this.transferType);
      },
    },
    beforeMount() {
      this.setPageTitle(this.$tr('selectContent'));
    },
    mounted() {
      this.getAvailableSpaceOnDrive();
    },
    beforeDestroy() {
      this.cancelAllTasks();
    },
    methods: {
      updateChannelMetadata() {
        // NOTE: This only updates the metadata, not the underlying content.
        // This could produced unexpected behavior for users.
        this.showUpdateProgressBar = true;
        return this.downloadChannelMetadata().then(() => {
          this.showUpdateProgressBar = false;
          // Update the topic in case content names have changed
          this.updateTreeViewTopic(this.topicNode);
          // Update total Channel resource counts
          this.updateResourceCounts();
        });
      },
      startTransferringContent() {
        this.contentTransferError = false;
        return this.transferChannelContent()
          .then(() => {
            this.$router.replace(manageContentPageLink());
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
        channel: state => wizardState(state).transferredChannel,
        channelIsInstalled,
        databaseIsLoading: ({ pageState }) => pageState.databaseIsLoading,
        firstTask: ({ pageState }) => pageState.taskList[0],
        mode: state => (wizardState(state).transferType === 'localexport' ? 'export' : 'import'),
        nodeTransferCounts,
        onDeviceInfoIsReady: state => !isEmpty(wizardState(state).currentTopicNode),
        selectedItems: state => wizardState(state).nodesForTransfer || {},
        transferType: state => wizardState(state).transferType,
        wizardStatus: state => wizardState(state).status,
        topicNode: state => wizardState(state).currentTopicNode,
      },
      actions: {
        setPageTitle(store, newTitle) {
          store.dispatch('SET_TOOLBAR_TITLE', newTitle);
        },
        cancelAllTasks(store) {
          const tasks = uniqBy(store.state.pageState.taskList, 'id');
          tasks.map(task => {
            TaskResource.cancelTask(task.id);
          });
        },
        downloadChannelMetadata,
        getAvailableSpaceOnDrive,
        transferChannelContent,
        waitForTaskToComplete,
        updateTreeViewTopic,
        updateResourceCounts(store) {
          const { transferredChannel, availableChannels } = wizardState(store.state);
          const updatedChannel = availableChannels.find(
            channel => channel.id === transferredChannel.id
          );
          store.dispatch('SET_TRANSFERRED_CHANNEL', updatedChannel);
        },
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
