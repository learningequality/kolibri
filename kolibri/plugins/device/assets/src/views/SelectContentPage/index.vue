<template>

  <ImmersivePage
    icon="back"
    :appBarTitle="appBarTitle"
    :route="backRoute"
  >
    <KPageContainer class="device-container">
      <ContentWizardUiAlert
        v-if="wholePageError"
        :errorType="wholePageError"
      />

      <template v-else>
        <TaskProgress v-if="!onDeviceInfoIsReady" />

        <template v-if="onDeviceInfoIsReady">
          <section
            v-if="transferredChannel && onDeviceInfoIsReady"
            class="updates"
          >
            <NewChannelVersionBanner
              v-if="newVersionAvailable"
              class="banner"
              :version="availableVersions.source"
              @click="handleClickViewNewVersion"
            />
          </section>
          <ChannelContentsSummary
            :channel="transferredChannel"
            :channelOnDevice="channelOnDevice"
            :freeSpace="availableSpace"
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
          <UiAlert
            v-show="isFileSpaceEnough"
            :dismissible="false"
            type="error"
          >
            {{ deviceString('notEnoughSpaceForChannelsWarning') }}
          </UiAlert>
          <ContentTreeViewer
            v-if="!newVersionAvailable"
            class="block-item"
            :class="{ small: windowIsSmall }"
            :style="{ borderBottomColor: $themeTokens.fineLine }"
          />
        </template>
      </template>
      <SelectionBottomBar
        v-if="!newVersionAvailable"
        objectType="resource"
        actionType="import"
        :resourceCounts="{ count: transferResourceCount, fileSize: transferFileSize }"
        :disabled="disableBottomBar || newVersionAvailable || isFileSpaceEnough"
        @clickconfirm="handleClickConfirm"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import isEmpty from 'lodash/isEmpty';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import { TaskTypes } from 'kolibri.utils.syncTaskUtils';
  import find from 'lodash/find';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { TaskResource } from 'kolibri.resources';
  import plugin_data from 'plugin_data';
  import commonDeviceStrings from '../commonDeviceStrings';
  import TaskProgress from '../ManageContentPage/TaskProgress';
  import useContentTasks from '../../composables/useContentTasks';
  import SelectionBottomBar from '../ManageContentPage/SelectionBottomBar';
  import taskNotificationMixin from '../taskNotificationMixin';
  import { updateTreeViewTopic } from '../../modules/wizard/handlers';
  import { getChannelWithContentSizes } from '../../modules/wizard/apiChannelMetadata';
  import NewChannelVersionBanner from '../ManageContentPage/NewChannelVersionBanner';
  import { ContentWizardErrors, PageNames } from '../../constants';
  import { availableChannelsPageLink } from '../ManageContentPage/manageContentLinks';
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
      NewChannelVersionBanner,
      ImmersivePage,
      SelectionBottomBar,
      TaskProgress,
      UiAlert,
    },
    mixins: [commonDeviceStrings, taskNotificationMixin],
    setup() {
      useContentTasks();
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    data() {
      return {
        contentTransferError: false,
        // need to store ID in component to make sure cancellation works properly
        // in beforeRouteLeave
        metadataDownloadTaskId: '',
        disableBottomBar: false,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['channelIsOnDevice']),
      ...mapState('manageContent', ['taskList']),
      ...mapGetters('manageContent/wizard', [
        'inLocalImportMode',
        'inPeerImportMode',
        'inRemoteImportMode',
      ]),
      ...mapState('manageContent/wizard', [
        'currentTopicNode',
        'selectedDrive',
        'selectedPeer',
        'status',
        'transferredChannel',
        'transferFileSize',
        'transferResourceCount',
        'availableSpace',
      ]),
      appBarTitle() {
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
        }
        return title;
      },
      backRoute() {
        if (this.inRemoteImportMode) {
          return availableChannelsPageLink();
        } else if (this.inPeerImportMode) {
          return availableChannelsPageLink({ addressId: this.selectedPeer.id });
        } else if (this.inLocalImportMode) {
          return availableChannelsPageLink({ driveId: this.selectedDrive.id });
        }
        return availableChannelsPageLink();
      },
      channelId() {
        return this.$route.params.channel_id;
      },
      onDeviceInfoIsReady() {
        return !isEmpty(this.currentTopicNode);
      },
      metadataDownloadTask() {
        return find(this.taskList, ({ type, channel_id }) => {
          return (
            channel_id === this.channelId &&
            (type === TaskTypes.REMOTECHANNELIMPORT || type === TaskTypes.DISKCHANNELIMPORT)
          );
        });
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
        return this.channelIsOnDevice(this.transferredChannel.id) || {};
      },
      availableVersions() {
        return {
          source: this.transferredChannel.version,
          installed: this.channelOnDevice.version,
        };
      },
      newVersionAvailable() {
        return this.availableVersions.source > this.availableVersions.installed;
      },
      isFileSpaceEnough() {
        if (plugin_data.isRemoteContent) {
          return false;
        } else return this.transferFileSize > this.availableSpace;
      },
    },
    watch: {
      // A REMOTE/DISKCHANNELIMPORT Task should be created inside the showAvailableChannels via
      // loadChannelMetadata function. When this component is mounted, it finds that Task
      // then waits until it completes to delete it automatically.
      metadataDownloadTask: {
        handler(val) {
          if (val) {
            this.metadataDownloadTaskId = val.id;
            if (val.clearable) {
              TaskResource.clear(val.id);
            }
          } else {
            this.metadataDownloadTaskId = '';
          }
        },
        immediate: true,
      },
    },
    beforeRouteLeave(to, from, next) {
      this.cancelMetadataDownloadTask();
      this.$store.commit('manageContent/wizard/RESET_NODE_LISTS');
      next();
    },
    methods: {
      ...mapActions('manageContent', ['cancelTask']),
      cancelMetadataDownloadTask() {
        if (this.metadataDownloadTaskId) {
          return this.cancelTask(this.metadataDownloadTaskId);
        }
        return Promise.resolve();
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
            id: this.selectedPeer.id,
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
          channelName: this.transferredChannel.name,
          included: nodesForTransfer.included.map(x => x.id),
          excluded: nodesForTransfer.omitted.map(x => x.id),
          fileSize: this.transferFileSize,
          totalResources: this.transferResources,
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
      handleClickViewNewVersion() {
        this.$router.push({
          name: PageNames.NEW_CHANNEL_VERSION_PAGE,
          query: { ...this.$route.query, last: PageNames.SELECT_CONTENT },
        });
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
      pageLoadError: {
        message: 'There was a problem loading this page…',
        context: 'Generic load error which may display if there is a problem retrieving channels.',
      },
      problemFetchingChannel: {
        message: 'There was a problem getting the resources of this channel',
        context: 'Error during channel import.',
      },
      problemTransferringContents: {
        message: 'There was a problem transferring the selected resources',
        context: 'Error during channel import.',
      },
      selectContent: {
        message: "Select resources from '{channelName}'",
        context: 'Refers to selecting learning resources from a specified channel.',
      },
      kolibriStudioLabel: {
        message: 'Kolibri Studio',
        context:
          'Refers to importing channels from Kolibri Studio. Kolibri Studio is the tool used to organize learning resources and build channels for Kolibri. See also https://kolibri-studio.readthedocs.io/en/latest/index.html',
      },
      importingFromDrive: {
        message: `Importing from drive '{driveName}'`,
        context: 'Indicates the name of the drive that the user is importing channels from.',
      },
      importingFromPeer: {
        message: `Importing from '{deviceName}' ({url})`,
        context: 'Indicates the name of the device that the user is importing channels from.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

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

  .banner {
    margin-bottom: 24px;
  }

</style>
