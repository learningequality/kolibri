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
          <span v-if="multipleMode">{{ $tr('selectEntireChannels') }}</span>
          <span v-else-if="inExportMode">{{ $tr('yourChannels') }}</span>
          <span v-else-if="inLocalImportMode">{{ selectedDrive.name }}</span>
          <span v-else>{{ coreString('channelsLabel') }}</span>
        </h1>
      </template>

      <template v-slot:abovechannels>
        <section v-if="notEnoughFreeSpace">
          {{ deviceStrings.$tr('notEnoughSpaceWarning') }}
        </section>
        <section
          v-if="showUnlistedChannels"
          class="unlisted-channels"
        >
          <span>{{ $tr('channelNotListedExplanation') }}&nbsp;</span>

          <KButton
            :text="$tr('channelTokenButtonLabel')"
            appearance="basic-link"
            name="showtokenmodal"
            @click="showTokenModal=true"
          />
        </section>

        <section v-if="!multipleMode" class="import-multiple">
          <KButton @click="goToImportMultiple">
            <KIcon icon="multiple" class="multiple-icon" />
            {{ $tr('importMultipleAction') }}
          </KButton>
        </section>
      </template>

      <template v-slot:default="{filteredItems, showItem, handleChange, itemIsSelected}">
        <p v-if="!channelsAreAvailable && !status">
          {{ $tr('noChannelsAvailable') }}
        </p>

        <div v-else>
          <ChannelPanel
            v-for="channel in allChannels"
            v-show="showItem(channel) && !channelIsBeingDeleted(channel.id)"
            :key="channel.id"
            :channel="channel"
            :onDevice="channelIsOnDevice(channel)"
            :mode="inExportMode ? 'EXPORT' : 'IMPORT'"
            :multipleMode="multipleMode"
            :checked="itemIsSelected(channel)"
            @clickselect="goToSelectContentPageForChannel(channel)"
            @checkboxchange="handleChange"
          />
        </div>
      </template>
    </FilteredChannelListContainer>

    <ChannelTokenModal
      v-if="showTokenModal"
      :disabled="disableModal"
      @cancel="showTokenModal=false"
      @submit="goToSelectContentPageForChannel"
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
      :selectedObjects="selectedChannels"
      :fileSize.sync="fileSize"
      @clickconfirm="handleClickConfirm"
    />

  </div>

</template>


<script>

  import { mapState, mapMutations, mapGetters } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ChannelPanel from '../ManageContentPage/ChannelPanel/WithImportDetails';
  import ContentWizardUiAlert from '../SelectContentPage/ContentWizardUiAlert';
  import { selectContentPageLink } from '../ManageContentPage/manageContentLinks';
  import { TransferTypes } from '../../constants';
  import FilteredChannelListContainer from '../ManageContentPage/FilteredChannelListContainer';
  import SelectionBottomBar from '../ManageContentPage/SelectionBottomBar';
  import deviceStrings from '../commonDeviceStrings';
  import ChannelTokenModal from './ChannelTokenModal';

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
      ContentWizardUiAlert,
      FilteredChannelListContainer,
      SelectionBottomBar,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    data() {
      return {
        showTokenModal: false,
        newPrivateChannels: [],
        selectedChannels: [],
        fileSize: 0,
        freeSpace: null,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['installedChannelsWithResources', 'channelIsBeingDeleted']),
      ...mapGetters('manageContent/wizard', [
        'inLocalImportMode',
        'inRemoteImportMode',
        'inExportMode',
        'isStudioApplication',
      ]),
      ...mapState('manageContent/wizard', [
        'availableChannels',
        'selectedDrive',
        'selectedPeer',
        'status',
        'transferType',
      ]),
      deviceStrings() {
        return deviceStrings;
      },
      allChannels() {
        return [...this.newPrivateChannels, ...this.availableChannels];
      },
      multipleMode() {
        const { multiple } = this.$route.query;
        return multiple === true || multiple === 'true';
      },
      documentTitle() {
        switch (this.transferType) {
          case TransferTypes.LOCALEXPORT:
            return this.$tr('documentTitleForExport');
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
          case TransferTypes.LOCALEXPORT:
            return this.$tr('exportToDisk', { driveName: this.selectedDrive.name });
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
      goToImportMultiple() {
        this.$router.push({
          query: {
            multiple: true,
          },
        });
      },
      goToSelectContentPageForChannel(channel) {
        if (this.multipleMode) {
          this.disableModal = true;
          this.$store
            .dispatch('manageContent/wizard/fetchPrivateChannelInfo', channel.id)
            .then(channels => {
              const newChannels = channels.map(x => Object.assign(x, { newPrivateChannel: true }));
              this.newPrivateChannels = [...newChannels, ...this.newPrivateChannels];
              this.showTokenModal = false;
            })
            .catch(error => {
              this.$store.dispatch('handleApiError', error);
            });
        } else {
          this.$router.push(
            selectContentPageLink({
              addressId: this.$route.query.address_id,
              channelId: channel.id,
              driveId: this.$route.query.drive_id,
              forExport: this.$route.query.for_export,
            })
          );
        }
      },
      handleClickConfirm() {
        // Disable button
        // reset freeSpace
        // Make call to deviceinfo
        // Compare this.fileSize with deviceinfo content_storage_free_space
        // toggle if notEnoughFreeSpace
      },
    },
    $trs: {
      exportToDisk: 'Export to {driveName}',
      importFromDisk: `Import from '{driveName}'`,
      importFromPeer: `Import from '{deviceName}' ({address})`,
      kolibriCentralServer: 'Kolibri Studio channels',
      importMultipleAction: 'Import multiple',
      yourChannels: 'Your channels',
      channelTokenButtonLabel: 'Try adding a token',
      channelNotListedExplanation: "Don't see your channel listed?",
      pageLoadError: 'There was a problem loading this page…',
      documentTitleForLocalImport: "Available Channels on '{driveName}'",
      documentTitleForRemoteImport: 'Available Channels on Kolibri Studio',
      documentTitleForExport: 'Available Channels on this device',
      noChannelsAvailable: 'No channels are available on this device',
      selectEntireChannels: 'Select entire channels for import',
    },
  };

</script>


<style lang="scss" scoped>

  .channel-list-header {
    padding: 16px 0;
    font-size: 14px;
  }

  svg.multiple-icon {
    width: 24px;
    height: 24px;
    margin: 0 4px -5px -2px;
  }

  .import-multiple {
    margin: 24px 0;

    button {
      margin: 0;
    }
  }

  .top-matter {
    margin-bottom: 24px;
  }

  .unlisted-channels {
    padding: 16px 0;
  }

  .text-offset {
    margin-top: 24px;
  }

  .align-left {
    text-align: left;
  }

  .seach-box {
    width: 100%;
  }

  .search-box-offset {
    margin-top: 12px;
  }

</style>
