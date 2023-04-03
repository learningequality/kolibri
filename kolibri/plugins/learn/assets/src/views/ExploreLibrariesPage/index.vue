<template>

  <ImmersivePage
    :appBarTitle="learnString('exploreLibraries')"
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
      :key="kolibriStudioId"
      :deviceId="kolibriStudioId"
      :deviceName="learnString('kolibriLibrary')"
      deviceIcon="cloud"
      :channels="kolibriLibraryChannels"
      :showDescription="true"
      :totalChannels="totalChannels"
      :pinIcon="getPinIcon(true)"
    />
    <LibraryItem
      v-for="device in pinnedDevices"
      :key="device['instance_id']"
      :deviceId="device['instance_id']"
      :deviceName="device['device_name']"
      :deviceIcon="getDeviceIcon(device)"
      :channels="device.channels"
      :totalChannels="device['total_channels']"
      :pinIcon="getPinIcon(isPinned(device['instance_id']))"
      @togglePin="handlePinToggle"
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
        :deviceId="device['instance_id']"
        :deviceName="device['device_name']"
        :deviceIcon="getDeviceIcon(device)"
        :channels="device.channels"
        :totalChannels="device['total_channels']"
        :pinIcon="getPinIcon(isPinned(device['instance_id']))"
        @togglePin="handlePinToggle"
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
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { RemoteChannelResource } from 'kolibri.resources';
  import commonLearnStrings from '../commonLearnStrings';
  import useChannels from '../../composables/useChannels';
  import useDevices from '../../composables/useDevices';
  import usePinnedDevices from '../../composables/usePinnedDevices';
  import { PageNames, KolibriStudioId } from '../../constants';
  import LibraryItem from './LibraryItem';

  const PinStrings = crossComponentTranslator(LibraryItem);

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
      const { createPinForUser, deletePinForUser, fetchPinsForUser } = usePinnedDevices();

      return {
        deletePinForUser,
        createPinForUser,
        fetchPinsForUser,
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
        usersPins: [],
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
      kolibriStudioId() {
        return KolibriStudioId;
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
      usersPinsDeviceIds() {
        // The IDs of devices (mapped to instance_id on the networkDevicesWithChannels
        // items) -- which the user has pinned
        return this.usersPins.map(pin => pin.instance_id);
      },
      pinnedDevices() {
        return this.networkDevicesWithChannels.filter(netdev => {
          return this.usersPinsDeviceIds.includes(netdev.instance_id);
        });
      },
      showKolibriLibrary() {
        return this.isSuperuser && this.isKolibriLibraryLoaded;
      },
      unpinnedDevices() {
        return this.networkDevicesWithChannels.filter(netdev => {
          return !this.usersPinsDeviceIds.includes(netdev.instance_id);
        });
      },
    },
    created() {
      // Fetch user's pins
      this.fetchPinsForUser().then(resp => {
        this.usersPins = resp.map(pin => {
          const instance_id = pin.instance_id.replace(/-/g, '');
          return { ...pin, instance_id };
        });
      });

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
      isPinned(instance_id) {
        return this.usersPinsDeviceIds.includes(instance_id);
      },
      createPin(instance_id) {
        return this.createPinForUser(instance_id).then(response => {
          const id = response.id;
          this.usersPins = [...this.usersPins, { instance_id, id }];
          // eslint-disable-next-line
          this.$store.dispatch('createSnackbar', PinStrings.$tr('pinnedTo'));
          this.moreDevices = this.moreDevices.filter(d => d.instance_id !== instance_id);
        });
      },
      deletePin(instance_id, pinId) {
        return this.deletePinForUser(pinId).then(() => {
          // Remove this pin from the usersPins
          this.usersPins = this.usersPins.filter(p => p.instance_id != instance_id);
          const removedDevice = this.networkDevicesWithChannels.find(
            d => d.instance_id === instance_id
          );

          if (removedDevice) {
            this.moreDevices.push(removedDevice);
          }
          // eslint-disable-next-line
          this.$store.dispatch('createSnackbar', PinStrings.$tr('pinRemoved'));
        });
      },
      handlePinToggle(instance_id) {
        if (this.usersPinsDeviceIds.includes(instance_id)) {
          const pinId = this.usersPins.find(pin => pin.instance_id === instance_id);
          this.deletePin(instance_id, pinId).catch(e => {
            console.error(e);
          });
        } else {
          this.createPin(instance_id).catch(e => {
            console.error(e);
          });
        }
      },
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
