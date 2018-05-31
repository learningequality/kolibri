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

  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uniqBy from 'lodash/uniqBy';
  import channelTokenModal from '../available-channels-page/channel-token-modal';
  import subpageContainer from '../containers/subpage-container';
  import channelListItem from '../manage-content-page/channel-list-item';
  import contentWizardUiAlert from '../select-content-page/content-wizard-ui-alert';
  import {
    installedChannelsWithResources,
    wizardState,
    inLocalImportMode,
    inRemoteImportMode,
    inExportMode,
  } from '../../state/getters';
  import { setToolbarTitle } from '../../state/actions/manageContentActions';
  import { selectContentPageLink } from '../manage-content-page/manageContentLinks';
  import { TransferTypes } from '../../constants';

  const ALL_FILTER = 'ALL';

  export default {
    name: 'availableChannelsPage',
    components: {
      channelListItem,
      channelTokenModal,
      contentWizardUiAlert,
      immersiveFullScreen,
      kButton,
      kFilterTextbox,
      subpageContainer,
      kLinearLoader,
      kSelect,
    },
    data() {
      return {
        languageFilter: {},
        titleFilter: '',
        showTokenModal: false,
      };
    },
    computed: {
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
    vuex: {
      getters: {
        availableChannels: state => wizardState(state).availableChannels,
        selectedDrive: state => wizardState(state).selectedDrive,
        installedChannelsWithResources,
        transferType: state => wizardState(state).transferType,
        wizardStatus: state => wizardState(state).status,
        inLocalImportMode,
        inRemoteImportMode,
        inExportMode,
      },
      actions: {
        setToolbarTitle,
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
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .channel-list-header
    font-size: 14px
    padding: 16px 0
    color: $core-text-annotation

  .channel-list-item:first-of-type
    border-top: 1px solid $core-grey

  .top-matter
    margin-bottom: 32px

  .channels
    width: 30%
    display: inline-block

  .filters
    width: 70%
    vertical-align: top
    margin: 16px 0
    display: inline-block

  .title-filter
    width: 50%
    float: right
    margin-top: 10px

  .unlisted-channels
    padding: 16px 0

</style>
