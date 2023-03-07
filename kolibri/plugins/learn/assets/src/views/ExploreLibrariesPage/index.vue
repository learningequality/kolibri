<template>

  <ImmersivePage
    :appBarTitle="$tr('exploreLibraries')"
    :route="backRoute"
    :primary="false"
  >
    <div
      class="page-header"
      :style="pageHeaderStyle"
    >
      <h1>
        {{ $tr('allLibraries') }}
      </h1>
      <p>
        {{ $tr('showingLibraries') }}
      </p>
    </div>
    <LibraryItem
      v-if="showKolibriLibrary"
      :key="$tr('kolibriLibrary')"
      :deviceName="$tr('kolibriLibrary')"
      deviceIcon="cloud"
      :channels="kolibriLibraryChannels"
      :showDescription="true"
      :totalChannels="totalChannels"
      :pinIcon="getPinIcon(true)"
    />
    <LibraryItem
      v-for="device in pinnedDevices"
      :key="device['instance_id']"
      :deviceName="device['device_name']"
      :deviceIcon="getDeviceIcon(device)"
      :channels="device.channels"
      :totalChannels="device['total_channels']"
      :pinIcon="getPinIcon(true)"
    />
    <div v-if="areMoreDevicesAvailable">
      <h2>{{ learnString('moreLibraries') }}</h2>
      <KButton
        v-if="displayShowButton"
        :text="coreString('showAction')"
        :primary="false"
        @click="loadMoreDevices"
      />
      <LibraryItem
        v-for="device in moreDevices"
        :key="device['instance_id']"
        :deviceName="device['device_name']"
        :deviceIcon="getDeviceIcon(device)"
        :channels="device.channels"
        :totalChannels="device['total_channels']"
        :pinIcon="getPinIcon(false)"
      />
      <KButton
        v-if="displayShowMoreButton"
        :text="coreString('showMoreAction')"
        :primary="false"
        @click="loadMoreDevices"
      />
    </div>
  </ImmersivePage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { RemoteChannelResource } from 'kolibri.resources';
  import commonLearnStrings from '../commonLearnStrings';
  import useChannels from '../../composables/useChannels';
  import useDevices from '../../composables/useDevices';
  import { PageNames } from '../../constants';
  import LibraryItem from './LibraryItem';

  export default {
    name: 'ExploreLibrariesPage',
    components: {
      ImmersivePage,
      LibraryItem,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { fetchChannels } = useChannels();
      const { fetchDevices } = useDevices();

      return {
        fetchChannels,
        fetchDevices,
      };
    },
    data() {
      return {
        networkDevices: [],
        kolibriLibraryChannels: [],
        totalChannels: 0,
        isKolibriLibraryLoaded: false,
        moreDevices: [],
      };
    },
    computed: {
      ...mapGetters(['isSuperuser']),
      areMoreDevicesAvailable() {
        return this.unpinnedDevices?.length > 0;
      },
      backRoute() {
        return { name: PageNames.LIBRARY };
      },
      displayShowButton() {
        return this.moreDevices.length === 0;
      },
      displayShowMoreButton() {
        return (
          this.moreDevices.length > 0 && this.moreDevices.length < this.unpinnedDevices?.length
        );
      },
      networkDevicesWithChannels() {
        return this.networkDevices.filter(device => device.channels?.length > 0);
      },
      pageHeaderStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
        };
      },
      pinnedDevices() {
        //ToDo: filter only pinned devices using pinning and unpinning api TBD
        return this.networkDevicesWithChannels;
      },
      showKolibriLibrary() {
        return this.isSuperuser && this.isKolibriLibraryLoaded;
      },
      unpinnedDevices() {
        //ToDo: filter only unpinned devices using pinning and unpinning api TBD
        return this.networkDevicesWithChannels;
      },
    },
    created() {
      RemoteChannelResource.getKolibriStudioStatus().then(({ data }) => {
        if (data.status === 'online') {
          RemoteChannelResource.fetchCollection()
            .then(channels => {
              this.isKolibriLibraryLoaded = true;
              this.kolibriLibraryChannels = channels.slice(0, 4);
              this.totalChannels = channels.length;
            })
            .catch(() => {
              this.isKolibriLibraryLoaded = true;
            });
        }
      });
      this.fetchDevices().then(devices => {
        this.networkDevices = devices;
        for (const device of this.networkDevices) {
          const baseurl = device.base_url;
          this.fetchChannels({ baseurl })
            .then(channels => {
              this.setNetworkDeviceChannels(device, channels.slice(0, 4), channels.length);
            })
            .catch(() => {
              this.setNetworkDeviceChannels(device, [], 0);
            });
        }
      });
    },
    methods: {
      getDeviceIcon(device) {
        if (device['operating_system'] === 'Android') {
          return 'device';
        } else if (!device['subset_of_users_device']) {
          return 'cloud';
        } else {
          return 'laptop';
        }
      },
      getPinIcon(pinned) {
        return pinned ? 'pinned' : 'notPinned';
      },
      loadMoreDevices() {
        const start = this.moreDevices.length;
        const end = start + 4;
        const nextDevices = this.unpinnedDevices.slice(start, end);
        this.moreDevices.push(...nextDevices);
      },
      setNetworkDeviceChannels(device, channels, total) {
        this.$set(device, 'channels', channels.slice(0, 4));
        this.$set(device, 'total_channels', total);
      },
    },
    $trs: {
      allLibraries: {
        message: 'All libraries',
        context: 'A header for Explore Libraries page',
      },
      exploreLibraries: {
        message: 'Explore libraries',
        context: 'Title for Explore Libraries page',
      },
      showingLibraries: {
        message: 'Showing libraries on other devices around you',
        continue: 'Description of the kind of devices displayed',
      },
      // The strings below are not used currently used in the code.
      // This is to aid the translation of the string
      /* eslint-disable kolibri/vue-no-unused-translations */
      allResources: {
        message: 'All resources',
        context: 'A filter option to show all resources',
      },
      kolibriLibrary: {
        message: 'Kolibri Library',
        context: 'Title for Kolibri Libraries',
      },
      libraryOf: {
        message: 'Library of {device}',
        context: 'A header for a device Library',
      },
      myDownloadsOnly: {
        message: 'My downloads only',
        context: 'A filter option to show only downloaded resources',
      },
      skip: {
        message: 'Skip',
        context: 'An action to filter only downloaded resources',
      },
      useDownloadedResourcesFilter: {
        message: 'Use this filter to only see resources you have downloaded from this library.',
        context: 'A dialog message displayed when filtering only downloaded resources',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .page-header {
    @extend %dropshadow-1dp;

    width: calc(100% + 60px);
    padding: 70px 30px 20px;
    margin-top: -50px;
    margin-bottom: 50px;
    margin-left: -30px;

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

</style>
