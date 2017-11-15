<template>

  <immersive-full-screen
    :backPageText="$tr('selectContent')"
    :backPageLink="goBackLink"
  >
    <subpage-container withSideMargin>
      <task-progress
        v-if="showUpdateProgressBar"
        type="UPDATING_CHANNEL"
        status="QUEUED"
        :percentage="0"
        :cancellable="false"
      />
      <task-progress
        v-if="tasksInQueue"
        type="UPDATING_CHANNEL"
        v-bind="firstTask"
        :cancellable="false"
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

      <section class="updates">
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
        :channel="channel"
        :channelOnDevice="channelOnDevice"
      />

      <template v-if="onDeviceInfoIsReady">
        <!-- Contains size estimates + submit button -->
        <selected-resources-size
          :mode="mode"
          :fileSize="total_file_size"
          :resourceCount="total_resource_count"
          :spaceOnDrive="availableSpace"
          @clickconfirm="startTransferringContent()"
        />
        <hr>
        <content-tree-viewer />
      </template>
    </subpage-container>
  </immersive-full-screen>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import selectedResourcesSize from './selected-resources-size';
  import contentTreeViewer from './content-tree-viewer';
  import channelContentsSummary from './channel-contents-summary';
  import uiAlert from 'keen-ui/src/UiAlert';
  import subpageContainer from '../containers/subpage-container';
  import { channelIsInstalled, wizardState } from '../../state/getters';
  import isEmpty from 'lodash/isEmpty';
  import { getAvailableSpaceOnDrive } from '../../state/actions/selectContentActions';
  import {
    downloadChannelMetadata,
    transferChannelContent,
    waitForTaskToComplete,
  } from '../../state/actions/contentTransferActions';
  import taskProgress from '../manage-content-page/task-progress';
  import { WizardTransitions } from '../../wizardTransitionRoutes';

  export default {
    name: 'selectContentPage',
    components: {
      channelContentsSummary,
      contentTreeViewer,
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
      goBackLink() {
        return {
          name: WizardTransitions.GOTO_AVAILABLE_CHANNELS_PAGE,
        };
      },
    },
    mounted() {
      this.getAvailableSpaceOnDrive();
    },
    methods: {
      updateChannelMetadata() {
        // NOTE: This only updates the metadata, not the underlying content.
        // This could produced unexpected behavior for users.
        this.showUpdateProgressBar = true;
        return this.downloadChannelMetadata().then(() => {
          this.showUpdateProgressBar = false;
        });
      },
      startTransferringContent() {
        return this.transferChannelContent();
      },
    },
    vuex: {
      getters: {
        availableSpace: state => wizardState(state).availableSpace || 0,
        channel: state => wizardState(state).transferChannel,
        channelIsInstalled,
        databaseIsLoading: ({ pageState }) => pageState.databaseIsLoading,
        firstTask: ({ pageState }) => pageState.taskList[0],
        mode: state => (wizardState(state).transferType === 'localexport' ? 'export' : 'import'),
        onDeviceInfoIsReady: state => !isEmpty(wizardState(state).currentTopicNode),
        selectedItems: state => wizardState(state).nodesForTransfer || {},
        tasksInQueue: ({ pageState }) => pageState.taskList.length > 0,
        total_file_size: () => 0,
        total_resource_count: () => 0,
        wizardStatus: state => wizardState(state).status,
      },
      actions: {
        downloadChannelMetadata,
        getAvailableSpaceOnDrive,
        transferChannelContent,
        waitForTaskToComplete,
      },
    },
    $trs: {
      channelUpToDate: 'Channel up-to-date',
      newVersionAvailable: 'Version {version, number} available',
      newVersionAvailableNotification:
        'New channel version available. Some of your files may be outdated or deleted.',
      selectContent: 'Select content',
      update: 'Update',
    },
  };

</script>


<style lang="stylus" scoped>

  .updates
    position: relative

  .updates-available
    position: absolute
    right: 0
    button
      margin-left: 16px

</style>
