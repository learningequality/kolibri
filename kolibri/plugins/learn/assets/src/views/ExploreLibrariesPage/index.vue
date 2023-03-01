<template>

  <ImmersivePage
    :appBarTitle="$tr('exploreLibraries')"
    :route="backRoute"
    :primary="false"
  >
    <div class="card-header">
      <h1>
        {{ $tr('allLibraries') }}
      </h1>
      <p>
        {{ $tr('showingLibraries') }}
      </p>
    </div>
    <div
      v-for="device in devices"
      :key="device['instance_id']"
    >
      <div>
        <h2>
          <KIcon :icon="getDeviceIcon(device['operating_system'])" />
          <span class="device-name"> {{ device['device_name'] }} </span>
          <KIconButton
            icon="bookmark"
            appearance="flat-button"
          />
        </h2>
        <KButton
          :text="coreString('explore')"
          :primary="false"
        />
      </div>
      <p>{{ $tr('channels', { channels: (device.channels || []).length }) }}</p>
      <div>
        <KGrid>
          <KGridItem
            v-for="channel in device.channels"
            :key="channel.id"
          >
            <div>
              <img
                v-if="channel.thumbnail"
                :src="channel.thumbnail"
              >
              <h2>{{ channel.name }}</h2>
              <p>{{ channel.description }}</p>
              <p>{{ $tr('version', { version: channel.version }) }}</p>
            </div>
          </KGridItem>
        </KGrid>
        {{ installedChannelsWithResources }}
      </div>
    </div>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { RemoteChannelResource } from 'kolibri.resources';
  import useChannels from '../../composables/useChannels';
  import useDevices from '../../composables/useDevices';
  import { PageNames } from '../../constants';

  export default {
    name: 'ExploreLibrariesPage',
    components: {
      ImmersivePage,
    },
    mixins: [commonCoreStrings],
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
        devices: [],
      };
    },
    computed: {
      backRoute() {
        return { name: PageNames.LIBRARY };
      },
    },
    created() {
      RemoteChannelResource.getKolibriStudioStatus().then(({ data }) => {
        if (data.status === 'online') {
          console.log(data.status);
        }
      });
      this.fetchDevices().then(devices => {
        this.devices = devices;
        for (const device of this.devices) {
          const baseurl = device.base_url;
          this.fetchChannels({ baseurl }).then(channels => {
            this.$set(device, 'channels', channels);
          });
        }
      });
    },
    methods: {
      getDeviceIcon(os) {
        switch (os) {
          case 'Android':
            return 'phone';
          case 'Server':
            return 'cloud';
          default:
            return 'language';
        }
      },
    },
    $trs: {
      allLibraries: {
        message: 'All libraries',
        context: 'A header for Explore Libraries page',
      },
      channels: {
        message:
          '{channels, number, integer} channels | Internet connection needed to browse and download resources',
        context: 'Indicates the number of channels on the Kolibri library',
      },
      exploreLibraries: {
        message: 'Explore libraries',
        context: 'Title for Explore Libraries page',
      },
      showingLibraries: {
        message: 'Showing libraries on other devices around you',
        continue: 'Description of the kind of devices displayed',
      },
      version: {
        message: 'Version {version, number, integer}',
        context:
          'Indicates the channel version. This can be updated when new resources are made available in a channel.',
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
      pinRemoved: {
        message: 'Pin removed from my library page',
        context: 'A notification message displayed after successfully unpinning a library',
      },
      pinTo: {
        message: 'Pin to my library page',
        context: 'A tooltip label shown when hovering over an unpinned library',
      },
      pinnedTo: {
        message: 'Pinned to my library page',
        context: 'A notification message displayed after successfully pinning a library',
      },
      removePin: {
        message: 'Remove pin from my library page',
        context: 'A tooltip label shown when hovering over a pinned library',
      },
      show: {
        message: 'Show',
        context: 'An action to display unpinned libraries',
      },
      showMore: {
        message: 'Show More',
        context: 'An action to display more unpinned libraries',
      },
      skip: {
        message: 'Skip',
        context: 'An action to filter only downloaded resources',
      },
      useDownloadedResourcesFilter: {
        message: 'Use this filter to see only resources you have downloaded from this library.',
        context: 'A dialog message displayed when filtering only downloaded resources',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  $card-header-margin: 100px;

  .card-header {
    width: 100%;
  }

</style>
