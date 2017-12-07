<template>

  <immersive-full-screen
    :backPageText="backText"
    :backPageLink="goBackLink"
  >
    <subpage-container withSideMargin>
      <div
        v-if="channelsAreAvailable"
        class="top-matter"
      >
        <div class="channels dib">
          <h1>{{ channelsTitle }}</h1>
          <p>{{ $tr('channelsAvailable', { channels: numberOfAvailableChannels }) }}</p>
        </div>
        <div class="filters dib">
          <ui-select
            :options="languageFilterOptions"
            v-model="languageFilter"
            :label="$tr('languageFilterLabel')"
            class="language-filter dib"
          />
          <k-filter-textbox
            :placeholder="$tr('titleFilterPlaceholder')"
            v-model="titleFilter"
            class="title-filter"
          />
        </div>
      </div>

      <ui-progress-linear
        v-if="channelsAreLoading"
        type="indefinite"
        color="primary"
      />

      <!-- Similar code in channels-grid -->
      <div v-if="channelsAreAvailable">
        <div class="channel-list-header">
          {{ $tr('channelHeader') }}
        </div>

        <div class="channels-list">
          <channel-list-item
            v-for="channel in availableChannels"
            v-show="showChannel(channel)"
            :channel="channel"
            :key="channel.id"
            :onDevice="channelIsOnDevice(channel)"
            @clickselect="goToChannel(channel)"
            class="channel-list-item"
            :mode="channelListItemMode"
          />
        </div>
      </div>

      <section
        class="unlisted-channels"
        v-if="showUnlistedChannels"
      >
        <channel-token-modal
          v-if="showTokenModal"
          @closemodal="showTokenModal=false"
          @channelfound="goToChannel"
        />
        <span>{{ $tr('channelNotListedExplanation') }}&nbsp;</span>

        <k-button
          :text="$tr('channelTokenButtonLabel')"
          appearance="basic-link"
          name="showtokenmodal"
          @click="showTokenModal=true"
        />
      </section>
    </subpage-container>
  </immersive-full-screen>

</template>


<script>

  import UiProgressLinear from 'keen-ui/src/UiProgressLinear';
  import UiSelect from 'keen-ui/src/UiSelect';
  import channelListItem from '../manage-content-page/channel-list-item';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import channelTokenModal from '../available-channels-page/channel-token-modal';
  import subpageContainer from '../containers/subpage-container';
  import uniqBy from 'lodash/uniqBy';
  import {
    installedChannelList,
    installedChannelsWithResources,
    wizardState,
  } from '../../state/getters';
  import { transitionWizardPage } from '../../state/actions/contentWizardActions';
  import { TransferTypes } from '../../constants';

  const ALL_FILTER = 'ALL';

  export default {
    name: 'availableChannelsPage',
    components: {
      channelListItem,
      channelTokenModal,
      immersiveFullScreen,
      kButton,
      kFilterTextbox,
      subpageContainer,
      UiProgressLinear,
      UiSelect,
    },
    data() {
      return {
        // Initialized with this filter, but localized label is added after mount
        languageFilter: { value: 'ALL' },
        titleFilter: '',
        showTokenModal: false,
      };
    },
    computed: {
      channelListItemMode() {
        if (this.transferType === TransferTypes.LOCALEXPORT) {
          return 'EXPORT';
        }
        return 'IMPORT';
      },
      channelsAreLoading() {
        return this.wizardStatus === 'LOADING_CHANNELS_FROM_KOLIBRI_STUDIO';
      },
      backText() {
        switch (this.transferType) {
          case TransferTypes.LOCALEXPORT:
            return this.$tr('exportToDisk', { driveName: this.selectedDrive.name });
          case TransferTypes.LOCALIMPORT:
            return this.$tr('importFromDisk', { driveName: this.selectedDrive.name });
          default:
            return this.$tr('kolibriCentralServer');
        }
      },
      channelsTitle() {
        switch (this.transferType) {
          case TransferTypes.LOCALEXPORT:
            return this.$tr('yourChannels');
          case TransferTypes.LOCALIMPORT:
            return this.selectedDrive.name;
          default:
            return this.$tr('channels');
        }
      },
      languageFilterOptions() {
        let channels;
        if (this.transferType === TransferTypes.LOCALEXPORT) {
          channels = this.availableChannels.filter(this.channelIsOnDevice);
        } else {
          channels = [...this.availableChannels];
        }
        const codes = uniqBy(channels, 'lang_code')
          .map(({ lang_name, lang_code }) => ({
            value: lang_code,
            label: lang_name,
          }))
          .filter(x => x.value);
        return [this.allLanguagesOption, ...codes];
      },
      numberOfAvailableChannels() {
        if (this.transferType === TransferTypes.LOCALEXPORT) {
          return this.availableChannels.filter(this.channelIsOnDevice).length;
        }
        return this.availableChannels.length;
      },
      channelsAreAvailable() {
        return !this.channelsAreLoading && this.availableChannels.length > 0;
      },
      showUnlistedChannels() {
        return this.channelsAreAvailable && this.transferType === TransferTypes.REMOTEIMPORT;
      },
      goBackLink() {
        return {
          name: 'wizardtransition',
          params: {
            transition: 'cancel',
          },
        };
      },
      allLanguagesOption() {
        return {
          label: this.$tr('allLanguages'),
          value: ALL_FILTER,
        };
      },
    },
    mounted() {
      this.languageFilter = { ...this.allLanguagesOption };
    },
    methods: {
      channelIsOnDevice(channel) {
        const match = this.installedChannelsWithResources.find(({ id }) => id === channel.id);
        return Boolean(match);
      },
      goToChannel(channel) {
        this.transitionWizardPage('forward', { channel });
      },
      showChannel(channel) {
        let languageMatches = true;
        let titleMatches = true;
        let isOnDevice = true;
        if (this.transferType === TransferTypes.LOCALEXPORT) {
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
        installedChannelList,
        installedChannelsWithResources,
        transferType: state => wizardState(state).transferType,
        wizardStatus: state => wizardState(state).status,
      },
      actions: {
        transitionWizardPage,
      },
    },
    $trs: {
      allLanguages: 'All Languages',
      channelsAvailable:
        '{channels, number, integer} {channels, plural, one {channel} other {channels} } available',
      channelHeader: 'Channel',
      channels: 'Channels',
      exportToDisk: 'Export to {driveName}',
      importFromDisk: 'Import from {driveName}',
      kolibriCentralServer: 'Kolibri Central Server',
      languageFilterLabel: 'Language:',
      titleFilterPlaceholder: 'Search for a channel…',
      yourChannels: 'Your channels',
      channelTokenButtonLabel: 'Try adding a token',
      channelNotListedExplanation: "Don't see your channel listed?",
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

  .dib
    display: inline-block

  .top-matter
    margin-bottom: 32px

  .channels
    width: 30%

  .filters
    width: 70%
    vertical-align: top
    margin: 16px 0

  .language-filter
    width: 45%

  .title-filter
    width: 50%
    float: right
    margin-top: 10px

  .unlisted-channels
    padding: 16px 0

</style>
