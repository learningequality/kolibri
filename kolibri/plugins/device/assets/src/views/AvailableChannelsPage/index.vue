<template>

  <div>
    <ContentWizardUiAlert
      v-if="status"
      :errorType="status"
    />

    <FilteredChannelListContainer :channels="availableChannels">
      <template v-slot:header>
        <h1 v-if="status === ''" data-test="title">
          <span v-if="inExportMode">{{ $tr('yourChannels') }}</span>
          <span v-else-if="inLocalImportMode">{{ selectedDrive.name }}</span>
          <span v-else>{{ coreString('channelsLabel') }}</span>
        </h1>
      </template>

      <template v-slot:abovechannels>
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

        <section class="import-multiple">
          <KButton @click="goToImportMultiple">
            <KIcon icon="multiple" class="multiple-icon" />
            {{ $tr('importMultipleAction') }}
          </KButton>
        </section>
      </template>

      <template v-slot:default="{filteredItems, showItem}">
        <p v-if="!channelsAreAvailable && !status">
          {{ $tr('noChannelsAvailable') }}
        </p>

        <div v-else>
          <ChannelPanel
            v-for="channel in filteredItems"
            v-show="showItem(channel)"
            :key="channel.id"
            :channel="channel"
            :onDevice="channelIsOnDevice(channel)"
            :mode="inExportMode ? 'EXPORT' : 'IMPORT'"
            @clickselect="goToSelectContentPageForChannel(channel)"
          />
        </div>
      </template>
    </FilteredChannelListContainer>

    <ChannelTokenModal
      v-if="showTokenModal"
      @cancel="showTokenModal=false"
      @submit="goToSelectContentPageForChannel"
    />
    <KLinearLoader
      v-if="channelsAreLoading"
      type="indeterminate"
      :delay="false"
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
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    data() {
      return {
        showTokenModal: false,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['installedChannelsWithResources']),
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
        console.log('import multiple');
      },
      goToSelectContentPageForChannel(channel) {
        this.$router.push(
          selectContentPageLink({
            addressId: this.$route.query.address_id,
            channelId: channel.id,
            driveId: this.$route.query.drive_id,
            forExport: this.$route.query.for_export,
          })
        );
      },
    },
    $trs: {
      exportToDisk: 'Export to {driveName}',
      importFromDisk: 'Import from {driveName}',
      importFromPeer: 'Import from {deviceName} ({address})',
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
