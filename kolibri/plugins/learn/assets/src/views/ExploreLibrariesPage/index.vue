<template>

  <ImmersivePage
    :appBarTitle="learnString('exploreLibraries')"
    :route="back"
    :primary="false"
    :loading="loading"
  >
    <div
      class="page-header"
      data-test="page-header"
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
      v-for="device in pinnedDevices"
      :key="device['instance_id']"
      :deviceId="device['instance_id']"
      :deviceName="device['device_name']"
      :deviceIcon="getDeviceIcon(device)"
      :channels="device.channels"
      :totalChannels="device['total_channels']"
      :pinIcon="getPinIcon(true)"
      :disablePinDevice="device['instance_id'] === studioId"
      @togglePin="handlePinToggle"
    />
    <div v-if="areMoreDevicesAvailable">
      <div
        v-if="pinnedDevicesExist"
        data-test="more-libraries"
      >
        <h2>{{ learnString('moreLibraries') }}</h2>
        <KButton
          v-if="displayShowButton"
          data-test="show-button"
          :text="coreString('showAction')"
          :primary="false"
          @click="loadMoreDevices"
        />
      </div>
      <LibraryItem
        v-for="(device, index) in moreDevices"
        :key="index"
        :deviceId="device['instance_id']"
        :deviceName="device['device_name']"
        :deviceIcon="getDeviceIcon(device)"
        :channels="device.channels"
        :totalChannels="device['total_channels']"
        :pinIcon="getPinIcon(false)"
        @togglePin="handlePinToggle"
      />
      <KButton
        v-if="displayShowMoreButton"
        data-test="show-more-button"
        :text="coreString('showMoreAction')"
        :primary="false"
        @click="loadMoreDevices"
      />
    </div>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonLearnStrings from '../commonLearnStrings';
  import useChannels from '../../composables/useChannels';
  import useContentLink from '../../composables/useContentLink';
  import useDevices from '../../composables/useDevices';
  import usePinnedDevices from '../../composables/usePinnedDevices';
  import { KolibriStudioId } from '../../constants';
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
      const { back } = useContentLink();
      const { fetchDevices } = useDevices();
      const { createPinForUser, deletePinForUser, fetchPinsForUser } = usePinnedDevices();

      return {
        deletePinForUser,
        createPinForUser,
        fetchPinsForUser,
        fetchChannels,
        fetchDevices,
        back,
      };
    },
    data() {
      return {
        loading: false,
        networkDevices: [],
        moreDevices: [],
        usersPins: [],
      };
    },
    computed: {
      areMoreDevicesAvailable() {
        return this.unpinnedDevices?.length > 0;
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
      studioId() {
        return KolibriStudioId;
      },
      usersPinsDeviceIds() {
        // The IDs of devices (mapped to instance_id on the networkDevicesWithChannels
        // items) -- which the user has pinned
        return this.usersPins.map(pin => pin.instance_id);
      },
      pinnedDevices() {
        return this.networkDevicesWithChannels.filter(device => {
          return (
            this.usersPinsDeviceIds.includes(device.instance_id) ||
            device.instance_id === this.studioId
          );
        });
      },
      pinnedDevicesExist() {
        return this.pinnedDevices.length > 0;
      },
      unpinnedDevices() {
        return this.networkDevicesWithChannels.filter(device => {
          return (
            !this.usersPinsDeviceIds.includes(device.instance_id) &&
            device.instance_id !== this.studioId
          );
        });
      },
    },
    watch: {
      pinnedDevicesExist: {
        handler(newValue) {
          if (!newValue) {
            this.loadMoreDevices();
          }
        },
        deep: true,
        immediate: false,
      },
    },
    created() {
      this.loading = true;
      // Fetch user's pins
      this.fetchPinsForUser().then(resp => {
        this.usersPins = resp.map(pin => {
          const instance_id = pin.instance_id.replace(/-/g, '');
          return { ...pin, instance_id };
        });
      });

      this.fetchDevices().then(devices => {
        this.loading = false;
        for (const device of devices) {
          const baseurl = device.base_url;
          this.fetchChannels({ baseurl })
            .then(channels => {
              this.addNetworkDevice(device, channels);
            })
            .catch(() => {
              this.addNetworkDevice(device, []);
            });
        }
      });
    },
    methods: {
      addNetworkDevice(device, channels) {
        this.networkDevices.push(
          Object.assign(device, {
            channels: channels.slice(0, 4),
            total_count: channels.length,
          })
        );
      },
      createPin(instance_id) {
        return this.createPinForUser(instance_id).then(response => {
          const id = response.id;
          this.usersPins = [...this.usersPins, { instance_id, id }];
          this.moreDevices = this.unpinnedDevices;

          // eslint-disable-next-line
          this.$store.dispatch('createSnackbar', PinStrings.$tr('pinnedTo'));
        });
      },
      deletePin(instance_id, pinId) {
        return this.deletePinForUser(pinId).then(() => {
          // Remove this pin from the usersPins
          this.usersPins = this.usersPins.filter(pin => pin.instance_id != instance_id);
          this.moreDevices = this.unpinnedDevices;

          // eslint-disable-next-line
          this.$store.dispatch('createSnackbar', PinStrings.$tr('pinRemoved'));
        });
      },
      handlePinToggle(instance_id) {
        if (this.usersPinsDeviceIds.includes(instance_id)) {
          const pinId = this.usersPins.find(pin => pin.instance_id === instance_id);
          this.deletePin(instance_id, pinId);
        } else {
          this.createPin(instance_id);
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
