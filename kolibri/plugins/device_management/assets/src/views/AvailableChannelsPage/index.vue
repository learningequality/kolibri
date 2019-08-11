<template>

  <div>
    <ContentWizardUiAlert
      v-if="status"
      :errorType="status"
    />

    <h1 v-if="status === ''" class="spec-ref-title">
      <span v-if="inExportMode">{{ $tr('yourChannels') }}</span>
      <span v-else-if="inLocalImportMode">{{ selectedDrive.name }}</span>
      <span v-else>{{ coreString('channelsLabel') }}</span>
    </h1>

    <KGrid v-if="channelsAreAvailable" class="top-matter">
      <KGridItem :layout12="{ span: 4 }">
        <p :class="{ 'text-offset': windowIsLarge }" class="spec-ref-available">
          {{ $tr('channelsAvailable', { channels: availableChannels.length }) }}
        </p>
      </KGridItem>
      <KGridItem :layout8="{ span: 3 }" :layout12="{ span: 3, alignment: 'right' }">
        <KSelect
          v-model="languageFilter"
          class="align-left"
          :options="languageFilterOptions"
          :label="$tr('languageFilterLabel')"
          :inline="true"
        />
      </KGridItem>
      <KGridItem :layout8="{ span: 5 }" :layout12="{ span: 5 }">
        <FilterTextbox
          v-model="titleFilter"
          :class="{ 'search-box-offset': !windowIsSmall }"
          :placeholder="$tr('titleFilterPlaceholder')"
          class="seach-box"
        />
      </KGridItem>
    </KGrid>

    <section
      v-if="showUnlistedChannels"
      class="unlisted-channels"
    >
      <ChannelTokenModal
        v-if="showTokenModal"
        @cancel="showTokenModal=false"
        @submit="goToSelectContentPageForChannel"
      />
      <span>{{ $tr('channelNotListedExplanation') }}&nbsp;</span>

      <KButton
        :text="$tr('channelTokenButtonLabel')"
        appearance="basic-link"
        name="showtokenmodal"
        @click="showTokenModal=true"
      />
    </section>

    <KLinearLoader
      v-if="channelsAreLoading"
      type="indeterminate"
      :delay="false"
    />

    <!-- Similar code in channels-grid -->
    <div v-if="channelsAreAvailable">
      <div class="channel-list-header" :style="{ color: $themeTokens.annotation }">
        {{ coreString('channelsLabel') }}
      </div>

      <div class="channels-list">
        <ChannelListItem
          v-for="channel in availableChannels"
          v-show="channelIsVisible(channel)"
          :key="channel.id"
          :channel="channel"
          :onDevice="channelIsOnDevice(channel)"
          :mode="inExportMode ? 'EXPORT' : 'IMPORT'"
          @clickselect="goToSelectContentPageForChannel(channel)"
        />
      </div>
    </div>
    <p v-else>
      <span v-if="!status">
        {{ $tr('noChannelsAvailable') }}
      </span>
    </p>
  </div>

</template>


<script>

  import { mapState, mapMutations, mapGetters } from 'vuex';
  import KThemeMixin from 'kolibri-components/src/mixins/KThemeMixin';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import uniqBy from 'lodash/uniqBy';
  import ChannelListItem from '../ManageContentPage/ChannelListItem';
  import ContentWizardUiAlert from '../SelectContentPage/ContentWizardUiAlert';
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
      FilterTextbox,
    },
    mixins: [commonCoreStrings, responsiveWindow, KThemeMixin],
    data() {
      return {
        languageFilter: {},
        titleFilter: '',
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
        return this.channelsAreAvailable && (this.inRemoteImportMode || this.isStudioApplication);
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
        this.setAppBarTitle(this.toolbarTitle(val));
      },
    },
    beforeMount() {
      this.languageFilter = { ...this.allLanguagesOption };
      this.setQuery(this.$route.query);
      if (this.status) {
        this.setAppBarTitle(this.$tr('pageLoadError'));
      } else {
        this.setAppBarTitle(this.toolbarTitle(this.transferType));
      }
    },
    methods: {
      ...mapMutations('coreBase', {
        setAppBarTitle: 'SET_APP_BAR_TITLE',
        setQuery: 'SET_QUERY',
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
      exportToDisk: 'Export to {driveName}',
      importFromDisk: 'Import from {driveName}',
      importFromPeer: 'Import from {deviceName} ({address})',
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
      noChannelsAvailable: 'No channels are available on this device',
    },
  };

</script>


<style lang="scss" scoped>

  .channel-list-header {
    padding: 16px 0;
    font-size: 14px;
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
