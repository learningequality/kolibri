<template>

  <immersive-full-screen
    :backPageText="backText"
    :backPageLink="goBackLink"
  >
    <subpage-container withSideMargin>
      <div class="top-matter">
        <div class="channels dib">
          <h1>{{ channelsTitle }}</h1>
          <p>{{ $tr('channelsAvailable', { channels: availableChannels.length }) }}</p>
        </div>
        <div
          v-if="channelsAreAvailable"
          class="filters dib"
        >
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
            :mode="transferType"
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
  import channelListItem from './manage-content-page/channel-list-item';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import channelTokenModal from './available-channels-page/channel-token-modal';
  import subpageContainer from './containers/subpage-container';
  import uniqBy from 'lodash/uniqBy';
  import { installedChannelList, wizardState } from '../state/getters';
  import { transitionWizardPage } from '../state/actions/contentWizardActions';

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
        channelsAreLoading: false,
        // Initialized with this filter, but localized label is added after mount
        languageFilter: { value: 'ALL' },
        titleFilter: '',
        showTokenModal: false,
      };
    },
    computed: {
      backText() {
        switch (this.transferType) {
          case 'localexport':
            return this.$tr('exportToDisk', { diskName: this.wizardMeta.destination.driveName });
          case 'localimport':
            return this.$tr('importFromDisk', { diskName: this.wizardMeta.source.driveName });
          default:
            return this.$tr('kolibriCentralServer');
        }
      },
      channelsTitle() {
        switch (this.transferType) {
          case 'localexport':
            return this.$tr('yourChannels');
          case 'localimport':
            return this.wizardMeta.source.driveName;
          default:
            return this.$tr('channels');
        }
      },
      languageFilterOptions() {
        const codes = uniqBy(this.availableChannels, 'language')
          .map(({ language, language_code }) => ({
            value: language_code,
            label: language,
          }))
          .filter(x => x.value);
        return [this.allLanguagesOption, ...codes];
      },
      channelsAreAvailable() {
        return this.availableChannels.length > 0;
      },
      showUnlistedChannels() {
        return this.channelsAreAvailable && this.transferType === 'remoteimport';
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
      this.languageFilter = {...this.allLanguagesOption};
    },
    methods: {
      channelIsOnDevice(channel) {
        return Boolean(this.installedChannelList.find(({ id }) => id === channel.id));
      },
      goToChannel(channel) {
        this.transitionWizardPage('forward', { channel });
      },
      showChannel(channel) {
        let languageMatches = true;
        let titleMatches = true;
        if (this.languageFilter.value !== ALL_FILTER) {
          languageMatches = channel.language_code === this.languageFilter.value;
        }
        if (this.titleFilter) {
          // Similar code in userSearchUtils
          const tokens = this.titleFilter.split(/\s+/).map(val => val.toLowerCase());
          titleMatches = tokens.every(token => channel.name.toLowerCase().includes(token));
        }
        return languageMatches && titleMatches;
      },
    },
    vuex: {
      getters: {
        availableChannels: state => wizardState(state).availableChannels,
        installedChannelList,
        transferType: state => wizardState(state).meta.transferType,
        wizardMeta: state => wizardState(state).meta,
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
      exportToDisk: 'Export to {diskName}',
      importFromDisk: 'Import from {diskName}',
      kolibriCentralServer: 'Kolibri Central Server',
      languageFilterLabel: 'Language:',
      titleFilterPlaceholder: 'Search for a channel…',
      yourChannels: 'Your channels',
      channelTokenButtonLabel: 'Try adding a token',
      channelNotListedExplanation: 'Don\'t see your channel listed?',
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

</style>
