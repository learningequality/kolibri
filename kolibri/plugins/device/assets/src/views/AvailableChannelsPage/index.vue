<template>

  <div>
    <ContentWizardUiAlert
      v-if="status"
      :errorType="status"
    />

    <FilteredChannelListContainer
      v-if="status === ''"
      :channels="allChannels"
      :selectedChannels.sync="selectedChannels"
      :selectAllCheckbox="multipleMode"
    >
      <template v-slot:header>
        <h1 v-if="status === ''" data-test="title">
          {{ multipleMode ? $tr('importChannelsHeader') : $tr('importResourcesHeader') }}
        </h1>
      </template>

      <template v-slot:abovechannels>
        <p>
          <KButton
            appearance="basic-link"
            :text="multipleMode ? $tr('selectTopicsAndResources') : $tr('selectEntireChannels')"
            @click="toggleMultipleMode"
          />
        </p>
        <p v-if="showUnlistedChannels">
          <KButton
            data-test="token-button"
            class="token-button"
            :text="$tr('channelTokenButtonLabel')"
            appearance="raised-button"
            name="showtokenmodal"
            @click="showTokenModal=true"
          />
        </p>
        <p>
          <UiAlert
            v-show="notEnoughFreeSpace"
            :dismissible="false"
            type="error"
          >
            {{ $tr('notEnoughSpaceForChannelsWarning') }}
          </UiAlert>
        </p>

      </template>

      <template v-slot:default="{filteredItems, showItem, handleChange, itemIsSelected}">
        <p v-if="!channelsAreAvailable && !status">
          {{ $tr('noChannelsAvailable') }}
        </p>

        <p v-else>
          <ChannelPanel
            v-for="channel in allChannels"
            v-show="showItem(channel) && !channelIsBeingDeleted(channel.id)"
            :key="channel.id"
            :channel="channel"
            :onDevice="channelIsOnDevice(channel)"
            :multipleMode="multipleMode"
            :checked="itemIsSelected(channel)"
            @clickselect="goToSelectContentPageForChannel(channel)"
            @checkboxchange="handleChange"
          />
        </p>
      </template>
    </FilteredChannelListContainer>

    <ChannelTokenModal
      v-if="showTokenModal"
      :disabled="disableModal"
      @cancel="showTokenModal=false"
      @submit="handleSubmitToken"
    />

    <ChannelUpdateModal
      v-if="showUpdateModal"
      :disabled="disableModal"
      @cancel="showUpdateModal=false"
      @submit="handleConfirmUpgrade"
    />

    <KLinearLoader
      v-if="channelsAreLoading"
      type="indeterminate"
      :delay="false"
    />

    <SelectionBottomBar
      v-if="multipleMode"
      objectType="channel"
      actionType="import"
      :disabled="disableBottomBar || selectedChannels.length === 0"
      :selectedObjects="selectedChannels"
      :fileSize.sync="fileSize"
      @clickconfirm="handleClickConfirm"
    />

  </div>

</template>


<script>

  import { mapState, mapMutations, mapGetters } from 'vuex';
  import omit from 'lodash/omit';
  import some from 'lodash/some';
  import uniqBy from 'lodash/uniqBy';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import UiAlert from 'keen-ui/src/UiAlert';
  import ChannelPanel from '../ManageContentPage/ChannelPanel/WithImportDetails';
  import ContentWizardUiAlert from '../SelectContentPage/ContentWizardUiAlert';
  import { selectContentPageLink } from '../ManageContentPage/manageContentLinks';
  import { TransferTypes, PageNames } from '../../constants';
  import FilteredChannelListContainer from '../ManageContentPage/FilteredChannelListContainer';
  import SelectionBottomBar from '../ManageContentPage/SelectionBottomBar';
  import taskNotificationMixin from '../taskNotificationMixin';
  import ChannelTokenModal from './ChannelTokenModal';
  import ChannelUpdateModal from './ChannelUpdateModal';
  import { getFreeSpaceOnServer } from './api';

  export default {
    name: 'AvailableChannelsPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      ChannelPanel,
      ChannelTokenModal,
      ChannelUpdateModal,
      ContentWizardUiAlert,
      FilteredChannelListContainer,
      SelectionBottomBar,
      UiAlert,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin, taskNotificationMixin],
    data() {
      return {
        showTokenModal: false,
        showUpdateModal: false,
        newUnlistedChannels: [],
        selectedChannels: [],
        fileSize: 0,
        freeSpace: null,
        disableBottomBar: false,
        disableModal: false,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['installedChannelsWithResources', 'channelIsBeingDeleted']),
      ...mapGetters('manageContent/wizard', [
        'inLocalImportMode',
        'inRemoteImportMode',
        'inPeerImportMode',
        'isStudioApplication',
      ]),
      ...mapState('manageContent/wizard', [
        'availableChannels',
        'selectedDrive',
        'selectedPeer',
        'status',
        'transferType',
      ]),
      allChannels() {
        const uninstalledChannels = this.availableChannels.filter(uninstalledChannel => {
          return !this.installedChannelsWithResources.find(
            ({ id }) => id === uninstalledChannel.id
          );
        });

        // Need to de-duplicate channels in case user enters same token twice, etc.
        return uniqBy(
          [
            ...this.newUnlistedChannels,
            ...this.installedChannelsWithResources,
            ...uninstalledChannels,
          ],
          'id'
        );
      },
      multipleMode() {
        const { multiple } = this.$route.query;
        return multiple === true || multiple === 'true';
      },
      documentTitle() {
        switch (this.transferType) {
          case TransferTypes.LOCALIMPORT:
            return this.$tr('documentTitleForLocalImport', {
              driveName: this.selectedDrive.name,
            });
          case TransferTypes.REMOTEIMPORT:
            return this.$tr('documentTitleForRemoteImport');
          case TransferTypes.PEERIMPORT:
            return this.$tr('documentTitleForLocalImport', {
              driveName: this.selectedPeer.device_name,
            });
          default:
            return '';
        }
      },
      channelsAreLoading() {
        return this.status === 'LOADING_CHANNELS_FROM_KOLIBRI_STUDIO';
      },
      channelsAreAvailable() {
        return !this.channelsAreLoading && this.availableChannels.length > 0;
      },
      showUnlistedChannels() {
        return this.channelsAreAvailable && (this.inRemoteImportMode || this.isStudioApplication);
      },
      notEnoughFreeSpace() {
        if (this.freeSpace === null) {
          return false;
        }
        return this.freeSpace < this.fileSize;
      },
    },
    watch: {
      // HACK doing it here to avoid moving $trs out of the component
      transferType(val) {
        this.setAppBarTitle(this.toolbarTitle(val));
      },
    },
    beforeMount() {
      this.$store.commit('coreBase/SET_QUERY', this.$route.query);
      if (this.status) {
        this.setAppBarTitle(this.$tr('pageLoadError'));
      } else {
        this.setAppBarTitle(this.toolbarTitle(this.transferType));
      }
    },
    methods: {
      ...mapMutations('coreBase', {
        setAppBarTitle: 'SET_APP_BAR_TITLE',
      }),
      toolbarTitle(transferType) {
        switch (transferType) {
          case TransferTypes.LOCALIMPORT:
            return this.$tr('importFromDisk', { driveName: this.selectedDrive.name });
          case TransferTypes.PEERIMPORT:
            return this.$tr('importFromPeer', {
              deviceName: this.selectedPeer.device_name,
              address: this.selectedPeer.base_url,
            });
          default:
            return this.$tr('kolibriCentralServer');
        }
      },
      channelIsOnDevice(channel) {
        const match = this.installedChannelsWithResources.find(({ id }) => id === channel.id);
        return Boolean(match);
      },
      toggleMultipleMode() {
        let newQuery;
        if (this.multipleMode) {
          newQuery = omit(this.$route.query, ['multiple']);
        } else {
          newQuery = {
            ...this.$route.query,
            multiple: true,
          };
        }
        this.$router.push({ query: newQuery });
      },
      handleSubmitToken(channel) {
        if (this.multipleMode) {
          this.disableModal = true;
          this.$store
            .dispatch('manageContent/wizard/fetchUnlistedChannelInfo', channel.id)
            .then(channels => {
              const newChannels = channels.map(x => Object.assign(x, { newUnlistedChannel: true }));
              // Need to de-duplicate channels in case user enters same token twice, etc.
              this.newUnlistedChannels = uniqBy(
                [...newChannels, ...this.newUnlistedChannels],
                'id'
              );
              this.showTokenModal = false;
              this.disableModal = false;
            })
            .catch(error => {
              this.$store.dispatch('handleApiError', error);
            });
        } else {
          this.goToSelectContentPageForChannel(channel);
        }
      },
      goToSelectContentPageForChannel(channel) {
        this.$router.push(
          selectContentPageLink({
            addressId: this.$route.query.address_id,
            channelId: channel.id,
            driveId: this.$route.query.drive_id,
          })
        );
      },
      handleClickConfirm() {
        this.disableBottomBar = true;
        const someChannelsWillUpdate = some(
          this.selectedChannels,
          c => c.installed_version < c.latest_version
        );
        getFreeSpaceOnServer().then(({ freeSpace }) => {
          this.freeSpace = freeSpace;
          if (this.notEnoughFreeSpace) {
            this.createTaskFailedSnackbar();
            this.disableBottomBar = false;
          } else {
            if (someChannelsWillUpdate) {
              this.showUpdateModal = true;
            } else {
              this.startMultipleChannelImport();
            }
          }
        });
      },
      handleConfirmUpgrade() {
        this.startMultipleChannelImport();
      },
      goToManageTasksPage() {
        this.$router.push({ name: PageNames.MANAGE_TASKS });
      },
      startMultipleChannelImport() {
        if (this.inLocalImportMode) {
          const taskParams = this.selectedChannels.map(x => ({
            channel_id: x.id,
            drive_id: this.selectedDrive.id,
          }));
          return TaskResource.startDiskBulkImport(taskParams)
            .then(tasks => {
              this.notifyAndWatchTask(tasks);
              this.goToManageTasksPage();
            })
            .catch(() => {
              this.createTaskFailedSnackbar();
              this.disableBottomBar = false;
            });
        } else {
          const peer_id = this.inPeerImportMode ? this.selectedPeer.id : null;
          const taskParams = this.selectedChannels.map(x => ({
            channel_id: x.id,
            peer_id,
          }));
          return TaskResource.startRemoteBulkImport(taskParams)
            .then(tasks => {
              this.notifyAndWatchTask(tasks);
              this.goToManageTasksPage();
            })
            .catch(() => {
              this.createTaskFailedSnackbar();
              this.disableBottomBar = false;
            });
        }
      },
    },
    $trs: {
      importChannelsHeader: 'Select channels for import',
      importResourcesHeader: 'Select resources for import',
      importFromDisk: `Import from '{driveName}'`,
      importFromPeer: `Import from '{deviceName}' ({address})`,
      kolibriCentralServer: 'Kolibri Studio channels',
      channelTokenButtonLabel: 'Import with token',
      pageLoadError: 'There was a problem loading this page…',
      documentTitleForLocalImport: "Available Channels on '{driveName}'",
      documentTitleForRemoteImport: 'Available Channels on Kolibri Studio',
      noChannelsAvailable: 'No channels are available on this device',
      selectEntireChannels: {
        message: 'Select entire channels instead',
        context:
          '\nAllow the user to select entire channels instead of individual topics/resources within a channel',
      },
      selectTopicsAndResources: {
        message: 'Select topics and resources instead',
        context:
          '\nAllow the user to select individual topics/resources within a channel instead of entire channels',
      },
      notEnoughSpaceForChannelsWarning: {
        message:
          'Not enough space available on your device. Free up disk space or select fewer resources',
        context:
          '\nWarning that appears when there is not enough space on the user’s device for the selected resources',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .channel-list-header {
    padding: 16px 0;
    font-size: 14px;
  }

  .token-button {
    margin-left: 0;
  }

</style>
