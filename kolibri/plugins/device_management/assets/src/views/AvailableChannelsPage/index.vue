<template>

  <div>
    <content-wizard-ui-alert
      v-if="wizardStatus"
      :errorType="wizardStatus"
    />

    <section
      v-if="channelsAreAvailable"
      class="top-matter"
    >
      <div class="channels">
        <h1 class="channels-header">
          <span v-if="inExportMode">{{ $tr('yourChannels') }}</span>
          <span v-else-if="inLocalImportMode">{{ selectedDrive.name }}</span>
          <span v-else>{{ $tr('channels') }}</span>
        </h1>

        <p>{{ $tr('channelsAvailable', { channels: availableChannels.length }) }}</p>
      </div>

      <div class="filters">
        <k-select
          :options="languageFilterOptions"
          v-model="languageFilter"
          :label="$tr('languageFilterLabel')"
          :inline="true"
        />
        <k-filter-textbox
          :placeholder="$tr('titleFilterPlaceholder')"
          v-model="titleFilter"
          class="title-filter"
        />
      </div>
    </section>

    <section
      v-if="showUnlistedChannels"
      class="unlisted-channels"
    >
      <channel-token-modal
        v-if="showTokenModal"
        @closemodal="showTokenModal=false"
        @channelfound="goToSelectContentPageForChannel"
      />
      <span>{{ $tr('channelNotListedExplanation') }}&nbsp;</span>

      <k-button
        :text="$tr('channelTokenButtonLabel')"
        appearance="basic-link"
        name="showtokenmodal"
        @click="showTokenModal=true"
      />
    </section>

    <k-linear-loader
      v-if="channelsAreLoading"
      type="indeterminate"
      :delay="false"
    />

    <!-- Similar code in channels-grid -->
    <div v-if="channelsAreAvailable">
      <div class="channel-list-header">
        {{ $tr('channelHeader') }}
      </div>

      <div class="channels-list">
        <channel-list-item
          v-for="channel in availableChannels"
          v-show="channelIsVisible(channel)"
          :channel="channel"
          :key="channel.id"
          :onDevice="channelIsOnDevice(channel)"
          @clickselect="goToSelectContentPageForChannel(channel)"
          class="channel-list-item"
          :mode="inExportMode ? 'EXPORT' : 'IMPORT'"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import ImmersiveFullScreen from 'kolibri.coreVue.components.ImmersiveFullScreen';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import KButton from 'kolibri.coreVue.components.KButton';
  import uniqBy from 'lodash/uniqBy';
  import SubpageContainer from '../containers/SubpageContainer';
  import ChannelListItem from '../ManageContentPage/ChannelListItem';
  import ContentWizardUiAlert from '../SelectContentPage/ContentWizardUiAlert';
  import { wizardState } from '../../state/getters';
  import { selectContentPageLink } from '../ManageContentPage/manageContentLinks';
  import { TransferTypes } from '../../constants';
  import ChannelTokenModal from './ChannelTokenModal';

  const ALL_FILTER = 'ALL';

  export default {
    name: 'AvailableChannelsPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      ChannelListItem,
      ChannelTokenModal,
      ContentWizardUiAlert,
      ImmersiveFullScreen,
      KButton,
      KFilterTextbox,
      SubpageContainer,
      KLinearLoader,
      KSelect,
    },
    data() {
      return {
        languageFilter: {},
        titleFilter: '',
        showTokenModal: false,
      };
    },
    computed: {
      ...mapGetters([
        'inLocalImportMode',
        'inRemoteImportMode',
        'inExportMode',
        'installedChannelsWithResources',
      ]),
      ...mapState({
        availableChannels: state => wizardState(state).availableChannels,
        selectedDrive: state => wizardState(state).selectedDrive,
        transferType: state => wizardState(state).transferType,
        wizardStatus: state => wizardState(state).status,
      }),
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
          default:
            return '';
        }
      },
      channelsAreLoading() {
        return this.wizardStatus === 'LOADING_CHANNELS_FROM_KOLIBRI_STUDIO';
      },
      languageFilterOptions() {
        const codes = uniqBy(this.availableChannels, 'lang_code')
          .map(({ lang_name, lang_code }) => ({
            value: lang_code,
            label: lang_name,
          }))
          .filter(x => x.value);
        return [this.allLanguagesOption, ...codes];
      },
      channelsAreAvailable() {
        return !this.channelsAreLoading && this.availableChannels.length > 0;
      },
      showUnlistedChannels() {
        return this.channelsAreAvailable && this.inRemoteImportMode;
      },
      allLanguagesOption() {
        return {
          label: this.$tr('allLanguages'),
          value: ALL_FILTER,
        };
      },
    },
    watch: {
      // HACK doing it here to avoid moving $trs out of the component
      transferType(val) {
        this.setToolbarTitle(this.toolbarTitle(val));
      },
    },
    beforeMount() {
      this.languageFilter = { ...this.allLanguagesOption };
      if (this.wizardStatus) {
        this.setToolbarTitle(this.$tr('pageLoadError'));
      } else {
        this.setToolbarTitle(this.toolbarTitle(this.transferType));
      }
    },
    methods: {
      ...mapActions(['setToolbarTitle']),
      toolbarTitle(transferType) {
        switch (transferType) {
          case TransferTypes.LOCALEXPORT:
            return this.$tr('exportToDisk', { driveName: this.selectedDrive.name });
          case TransferTypes.LOCALIMPORT:
            return this.$tr('importFromDisk', { driveName: this.selectedDrive.name });
          default:
            return this.$tr('kolibriCentralServer');
        }
      },
      channelIsOnDevice(channel) {
        const match = this.installedChannelsWithResources.find(({ id }) => id === channel.id);
        return Boolean(match);
      },
      goToSelectContentPageForChannel(channel) {
        this.$router.push(
          selectContentPageLink({
            channelId: channel.id,
            driveId: this.$route.query.drive_id,
            forExport: this.$route.query.for_export,
          })
        );
      },
      channelIsVisible(channel) {
        let languageMatches = true;
        let titleMatches = true;
        let isOnDevice = true;
        if (this.inExportMode) {
          isOnDevice = this.channelIsOnDevice(channel);
        }
        if (this.languageFilter.value !== ALL_FILTER) {
          languageMatches = channel.lang_code === this.languageFilter.value;
        }
        if (this.titleFilter) {
          // Similar code in userSearchUtils
          const tokens = this.titleFilter.split(/\s+/).map(val => val.toLowerCase());
          titleMatches = tokens.every(token => channel.name.toLowerCase().includes(token));
        }
        return languageMatches && titleMatches && isOnDevice;
      },
    },
    $trs: {
      allLanguages: 'All languages',
      channelsAvailable:
        '{channels, number, integer} {channels, plural, one {channel} other {channels} } available',
      channelHeader: 'Channel',
      channels: 'Channels',
      exportToDisk: 'Export to {driveName}',
      importFromDisk: 'Import from {driveName}',
      kolibriCentralServer: 'Kolibri Studio',
      languageFilterLabel: 'Language',
      titleFilterPlaceholder: 'Search for a channel…',
      yourChannels: 'Your channels',
      channelTokenButtonLabel: 'Try adding a token',
      channelNotListedExplanation: "Don't see your channel listed?",
      pageLoadError: 'There was a problem loading this page…',
      documentTitleForLocalImport: "Available Channels on '{driveName}'",
      documentTitleForRemoteImport: 'Available Channels on Kolibri Studio',
      documentTitleForExport: 'Available Channels on this device',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .channel-list-header {
    padding: 16px 0;
    font-size: 14px;
    color: $core-text-annotation;
  }

  .channel-list-item:first-of-type {
    border-top: 1px solid $core-grey;
  }

  .top-matter {
    margin-bottom: 32px;
  }

  .channels {
    display: inline-block;
    width: 30%;
  }

  .filters {
    display: inline-block;
    width: 70%;
    margin: 16px 0;
    vertical-align: top;
  }

  .title-filter {
    float: right;
    width: 50%;
    margin-top: 10px;
  }

  .unlisted-channels {
    padding: 16px 0;
  }

</style>
