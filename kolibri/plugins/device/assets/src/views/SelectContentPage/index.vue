<template>

  <div>
    <ContentWizardUiAlert
      v-if="wholePageError"
      :errorType="wholePageError"
    />

    <template v-else>
      <TaskProgress
        v-if="showUpdateProgressBar"
        type="UPDATING_CHANNEL"
        status="QUEUED"
        :percentage="0"
        :showButtons="true"
        :cancellable="true"
        @canceltask="cancelUpdateChannel()"
      />
      <TaskProgress
        v-else-if="metadataDownloadTask"
        type="DOWNLOADING_CHANNEL_CONTENTS"
        v-bind="metadataDownloadTask"
        :showButtons="true"
        :cancellable="true"
        @canceltask="returnToChannelsList()"
      />

      <template v-if="mainAreaIsVisible">
        <section class="notifications">
          <UiAlert
            v-if="newVersionAvailable"
            type="info"
            :removeIcon="true"
            :dismissible="false"
          >
            {{ $tr('newVersionAvailableNotification') }}
          </UiAlert>
        </section>
        <section
          v-if="transferredChannel && onDeviceInfoIsReady"
          class="updates"
        >
          <div
            v-if="newVersionAvailable"
            class="updates-available"
          >
            <span>
              {{ $tr('newVersionAvailable', { version: transferredChannel.version }) }}
            </span>
            <KButton
              :text="$tr('update')"
              :primary="true"
              name="update"
              @click="updateChannelMetadata()"
            />
          </div>
          <span v-else>{{ $tr('channelUpToDate') }}</span>
        </section>
        <ChannelContentsSummary
          :channel="transferredChannel"
          :channelOnDevice="channelOnDevice"
        />

        <UiAlert
          v-if="status !== ''"
          type="error"
          :dismissible="false"
        >
          {{ $tr('problemFetchingChannel') }}
        </UiAlert>

        <UiAlert
          v-if="contentTransferError"
          type="error"
          :dismissible="false"
        >
          {{ $tr('problemTransferringContents') }}
        </UiAlert>

        <ContentTreeViewer
          v-if="!newVersionAvailable"
          class="block-item"
          :class="{ small : windowIsSmall }"
          :style="{ borderBottomColor: $themeTokens.fineLine }"
        />
      </template>
    </template>
    <SelectionBottomBar
      v-if="!newVersionAvailable"
      objectType="resource"
      actionType="import"
      :resourceCounts="{count:nodeCounts.resources, fileSize:nodeCounts.fileSize}"
      :disabled="disableBottomBar || newVersionAvailable"
      @clickconfirm="handleClickConfirm"
    />
  </div>

</template>


<script>

  import { mapState, mapActions, mapMutations, mapGetters } from 'vuex';
  import UiAlert from 'keen-ui/src/UiAlert';
  import isEmpty from 'lodash/isEmpty';
  import find from 'lodash/find';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import TaskProgress from '../ManageContentPage/TaskProgress';
  import { ContentWizardErrors, TaskTypes, PageNames } from '../../constants';
  import { manageContentPageLink } from '../ManageContentPage/manageContentLinks';
  import { downloadChannelMetadata } from '../../modules/wizard/utils';
  import SelectionBottomBar from '../ManageContentPage/SelectionBottomBar';
  import taskNotificationMixin from '../taskNotificationMixin';
  import { updateTreeViewTopic } from '../../modules/wizard/handlers';
  import { getChannelWithContentSizes } from '../../modules/wizard/apiChannelMetadata';
  import ChannelContentsSummary from './ChannelContentsSummary';
  import ContentTreeViewer from './ContentTreeViewer';
  import ContentWizardUiAlert from './ContentWizardUiAlert';
  import { startImportTask } from './api';

  export default {
    name: 'SelectContentPage',
    metaInfo() {
      return {
        title: this.$tr('selectContent', { channelName: this.transferredChannel.name }),
      };
    },
    components: {
      ChannelContentsSummary,
      ContentTreeViewer,
      ContentWizardUiAlert,
      SelectionBottomBar,
      TaskProgress,
      UiAlert,
    },
    mixins: [responsiveWindowMixin, taskNotificationMixin],
    data() {
      return {
        showUpdateProgressBar: false,
        contentTransferError: false,
        pageWillRefresh: false,
        // need to store ID in component to make sure cancellation works properly
        // in beforeDestroy
        metadataDownloadTaskId: '',
        disableBottomBar: false,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['channelIsInstalled']),
      ...mapState('manageContent', ['taskList']),
      ...mapGetters('manageContent/wizard', [
        'nodeTransferCounts',
        'inLocalImportMode',
        'inPeerImportMode',
        'inRemoteImportMode',
      ]),
      ...mapState('manageContent/wizard', [
        'currentTopicNode',
        'selectedDrive',
        'selectedPeer',
        'status',
        'transferType',
        'transferredChannel',
      ]),
      channelId() {
        return this.$route.params.channel_id;
      },
      mainAreaIsVisible() {
        // Don't show main area if page is about to refresh after updating (or cancelling update)
        if (this.pageWillRefresh) {
          return false;
        }
        return this.onDeviceInfoIsReady;
      },
      onDeviceInfoIsReady() {
        return !isEmpty(this.currentTopicNode);
      },
      metadataDownloadTask() {
        return (
          find(this.taskList, { type: TaskTypes.REMOTECHANNELIMPORT }) ||
          find(this.taskList, { type: TaskTypes.DISKCHANNELIMPORT })
        );
      },
      // If this property is truthy, the entire UI is hidden and only the UiAlert is shown
      wholePageError() {
        // Show errors thrown during data fetching
        if (Object.values(ContentWizardErrors).includes(this.status)) {
          return this.status;
        }

        return undefined;
      },
      channelOnDevice() {
        return this.channelIsInstalled(this.transferredChannel.id) || {};
      },
      newVersionAvailable() {
        return this.transferredChannel.version > this.channelOnDevice.version;
      },
      nodeCounts() {
        return this.nodeTransferCounts(this.transferType);
      },
    },
    watch: {
      metadataDownloadTask(val) {
        if (val) {
          this.metadataDownloadTaskId = val.id;
        } else {
          this.metadataDownloadTaskId = '';
        }
      },
      transferredChannel(val) {
        if (val.name) {
          this.setAppBarTitle(this.$tr('selectContent', { channelName: val.name }));
        }
      },
    },
    beforeRouteLeave(to, from, next) {
      this.cancelMetadataDownloadTask();
      this.$store.commit('manageContent/wizard/RESET_NODE_LISTS');
      next();
    },
    mounted() {
      let title;
      if (this.wholePageError) {
        title = this.$tr('pageLoadError');
      } else {
        // Set app bar labels based on what kind of import/export the user is engaged in.
        if (this.inRemoteImportMode) {
          if (this.$route.query.last === PageNames.MANAGE_CHANNEL) {
            title = this.transferredChannel.name;
          } else {
            title = this.$tr('kolibriStudioLabel');
          }
        } else if (this.inPeerImportMode) {
          title = this.$tr('importingFromPeer', {
            deviceName: this.selectedPeer.device_name,
            url: this.selectedPeer.base_url,
          });
        } else if (this.inLocalImportMode) {
          title = this.$tr('importingFromDrive', { driveName: this.selectedDrive.name });
        }

        if (title) {
          this.setAppBarTitle(title);
        }
      }
    },
    methods: {
      ...mapMutations('coreBase', {
        setAppBarTitle: 'SET_APP_BAR_TITLE',
      }),
      ...mapActions('manageContent', ['cancelTask']),
      downloadChannelMetadata,
      cancelUpdateChannel() {
        this.showUpdateProgressBar = false;
        this.cancelMetadataDownloadTask().then(this.refreshPage);
      },
      cancelMetadataDownloadTask() {
        if (this.metadataDownloadTaskId) {
          return this.cancelTask(this.metadataDownloadTaskId);
        }
        return Promise.resolve();
      },
      updateChannelMetadata() {
        // NOTE: This only updates the metadata, not the underlying content.
        // This could produced unexpected behavior for users.
        this.showUpdateProgressBar = true;
        this.pageWillRefresh = true;
        return this.downloadChannelMetadata(this.$store)
          .then(() => this.refreshPage())
          .catch(error => {
            if (error.errorType !== 'CHANNEL_TASK_ERROR') {
              this.contentTransferError = true;
            }
          });
      },
      handleClickConfirm() {
        let importSource;

        // Lots of extra validation in case there are mistakes in refactor
        if (this.inRemoteImportMode) {
          importSource = { type: 'studio' };
        } else if (this.inPeerImportMode) {
          if (!this.selectedPeer.base_url) {
            throw Error('Peer URL is not provided');
          }
          importSource = {
            type: 'peer',
            baseUrl: this.selectedPeer.base_url,
          };
        } else if (this.inLocalImportMode) {
          if (!this.selectedDrive.id) {
            throw Error('Drive ID is not provided');
          }
          importSource = {
            type: 'drive',
            driveId: this.selectedDrive.id,
          };
        } else {
          throw Error('Import source is not provided');
        }

        const { nodesForTransfer } = this.$store.state.manageContent.wizard;

        this.disableBottomBar = true;

        this.startImportTask({
          importSource,
          channelId: this.channelId,
          included: nodesForTransfer.included.map(x => x.id),
          excluded: nodesForTransfer.omitted.map(x => x.id),
          fileSize: this.nodeCounts.fileSize,
          totalResources: this.nodeCounts.resources,
        })
          .then(task => {
            this.disableBottomBar = false;
            this.notifyAndWatchTask(task);
          })
          .catch(() => {
            this.disableBottomBar = false;
            this.createTaskFailedSnackbar();
          });
      },
      startImportTask,
      refreshPage() {
        this.$router.go();
      },
      returnToChannelsList() {
        this.$router.push(manageContentPageLink());
      },
      // @public (used by taskNotificationMixin)
      onWatchedTaskFinished() {
        // After import task has finished, refresh so those nodes will be disabled
        updateTreeViewTopic(this.$store, this.currentTopicNode);
        // Clear out selections
        this.$store.commit('manageContent/wizard/RESET_NODE_LISTS');
        // Update channel metadata
        getChannelWithContentSizes(this.channelId).then(channel => {
          this.$store.commit('manageContent/wizard/UPDATE_TRANSFERRED_CHANNEL', {
            on_device_file_size: channel.on_device_file_size,
            on_device_resources: channel.on_device_resources,
          });
        });
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
      kolibriStudioLabel: 'Kolibri Studio',
      importingFromDrive: `Importing from drive '{driveName}'`,
      importingFromPeer: `Importing from '{deviceName}' ({url})`,
    },
  };

</script>


<style lang="scss" scoped>

  .notifications {
    margin-top: 8px;
  }

  .updates {
    text-align: right;
  }

  .block-item {
    padding-top: 16px;
    padding-right: 24px;
    padding-bottom: 16px;
    padding-left: 24px;
    margin-top: 24px;
    margin-right: -24px;
    margin-left: -24px;
    border-bottom-style: solid;
    border-bottom-width: 1px;
  }

  .small .block-item {
    padding-right: 16px;
    padding-left: 16px;
    margin-right: -16px;
    margin-left: -16px;
  }

</style>
