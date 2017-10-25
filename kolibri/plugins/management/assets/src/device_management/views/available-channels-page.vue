<template>

  <immersive-full-screen backPageText="Back" :backPageLink="goBackLink">
    <subpage-container withSideMargin>
      <div class="top-matter">
        <div class="channels dib">
          <h1>{{ $tr('channelsTitle') }}</h1>
          <p>{{ $tr('channelsAvailable', { channels: availableChannels.length }) }}</p>
        </div>
        <div v-if="channelsAreAvailable" class="filters dib">
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

      <ui-progress-linear v-if="this.channelsAreLoading" type="indefinite" color="primary"/>

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
            mode="importing"
          />
        </div>
      </div>
    </subpage-container>
  </immersive-full-screen>

</template>


<script>

  import channelListItem from './manage-content-page/channel-list-item';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import subpageContainer from './containers/subpage-container';
  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';
  import uiSelect from 'keen-ui/src/UiSelect';
  import uniqBy from 'lodash/uniqBy';
  import { transitionWizardPage } from '../state/actions/contentWizardActions';

  export default {
    name: 'availableChannelsPage',
    components: {
      channelListItem,
      immersiveFullScreen,
      kFilterTextbox,
      subpageContainer,
      uiProgressLinear,
      uiSelect,
    },
    data() {
      return {
        channelsAreLoading: false,
        // Initialized with this filter, but localized label is added after mount
        languageFilter: { value: 'ALL' },
        titleFilter: '',
      };
    },
    computed: {
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
          value: 'ALL',
        };
      },
    },
    mounted() {
      this.languageFilter = Object.assign({}, this.allLanguagesOption);
    },
    methods: {
      showChannel(channel) {
        let languageMatches = true;
        let titleMatches = true;
        if (this.languageFilter.value !== 'ALL') {
          languageMatches = channel.language_code === this.languageFilter.value;
        }
        if (this.titleFilter) {
          // Similar code in userSearchUtils
          const tokens = this.titleFilter.split(/\s+/).map(val => val.toLowerCase());
          titleMatches = tokens.every(token => channel.name.toLowerCase().includes(token));
        }
        return languageMatches && titleMatches;
      },
      goToChannel(channel) {
        this.transitionWizardPage('forward', { id: channel.id });
      },
    },
    vuex: {
      getters: {
        availableChannels: ({ pageState }) => pageState.wizardState.availableChannels,
        channelsOnDevice: ({ pageState }) => pageState.wizardState.channelsOnDevice,
        channelIsOnDevice: ({ pageState }) => channel =>
          Boolean(pageState.wizardState.channelsOnDevice.find(({ id }) => id === channel.id)),
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
      channelsTitle: 'Channels',
      languageFilterLabel: 'Language:',
      titleFilterPlaceholder: 'Search for a channel…',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .channel-list-header
    font-size: 0.85em
    padding: 1em 0
    color: $core-text-annotation

  .channel-list-item:first-of-type
    border-top: 1px solid $core-grey

  .dib
    display: inline-block

  .top-matter
    margin-bottom: 2em

  .channels
    width: 30%

  .filters
    width: 70%
    vertical-align: top
    margin: 1em 0

  .language-filter
    width: 45%

  .title-filter
    width: 50%
    float: right
    margin-top: 10px

</style>
