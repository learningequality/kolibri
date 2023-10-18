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
    <div v-if="loading">
      <KCircularLoader />
    </div>
    <FadeInTransitionGroup v-else>
      <LibraryItem
        v-for="device in pinnedDevices"
        :key="device['instance_id']"
        :deviceId="device['instance_id']"
        :deviceName="device['device_name']"
        :deviceIcon="getDeviceIcon(device)"
        :channels="deviceChannelsMap[device['instance_id']]"
        :pinIcon="getPinIcon(true)"
        :showDescription="device['instance_id'] === studioId"
        :disablePinDevice="device['instance_id'] === studioId"
        @togglePin="handlePinToggle"
      />
      <div v-if="areMoreDevicesAvailable" key="moreDevices">
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
        <FadeInTransitionGroup>
          <LibraryItem
            v-for="device in unpinnedDevices.slice(0, moreDevices)"
            :key="device['instance_id']"
            :deviceId="device['instance_id']"
            :deviceName="device['device_name']"
            :deviceIcon="getDeviceIcon(device)"
            :channels="deviceChannelsMap[device['instance_id']]"
            :pinIcon="getPinIcon(false)"
            @togglePin="handlePinToggle"
          />
        </FadeInTransitionGroup>
        <KButton
          v-if="displayShowMoreButton"
          data-test="show-more-button"
          :text="coreString('showMoreAction')"
          :primary="false"
          @click="loadMoreDevices"
        />
      </div>
    </FadeInTransitionGroup>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonLearnStrings from '../commonLearnStrings';
  import FadeInTransitionGroup from '../FadeInTransitionGroup';
  import useContentLink from '../../composables/useContentLink';
  import useDevices from '../../composables/useDevices';
  import usePinnedDevices from '../../composables/usePinnedDevices';
  import { KolibriStudioId } from '../../constants';
  import LibraryItem from './LibraryItem';

  const PinStrings = crossComponentTranslator(LibraryItem);

  export default {
    name: 'ExploreLibrariesPage',
    components: {
      FadeInTransitionGroup,
      ImmersivePage,
      LibraryItem,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const {
        networkDevicesWithChannels,
        keepDeviceChannelsUpdated,
        deviceChannelsMap,
        isLoadingChannels,
      } = useDevices();
      const {
        createPinForUser,
        deletePinForUser,
        fetchPinsForUser,
        userPinsMap,
        pinnedDevices,
        unpinnedDevices,
        pinnedDevicesExist,
      } = usePinnedDevices(networkDevicesWithChannels);
      const { back } = useContentLink();

      keepDeviceChannelsUpdated();

      fetchPinsForUser();

      return {
        deletePinForUser,
        createPinForUser,
        pinnedDevices,
        unpinnedDevices,
        pinnedDevicesExist,
        userPinsMap,
        deviceChannelsMap,
        networkDevicesWithChannels,
        back,
        loading: isLoadingChannels,
      };
    },
    data() {
      return {
        moreDevices: 0,
      };
    },
    computed: {
      areMoreDevicesAvailable() {
        return this.unpinnedDevices?.length > 0;
      },
      displayShowButton() {
        return this.moreDevices === 0 && this.areMoreDevicesAvailable;
      },
      displayShowMoreButton() {
        return !this.displayShowButton && this.moreDevices < this.unpinnedDevices?.length;
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
    },
    methods: {
      createPin(instance_id) {
        return this.createPinForUser(instance_id).then(() => {
          this.moreDevices = 0;
          // eslint-disable-next-line
          this.$store.dispatch('createSnackbar', PinStrings.$tr('pinnedTo'));
        });
      },
      deletePin(instance_id) {
        return this.deletePinForUser(instance_id).then(() => {
          if (Object.keys(this.userPinsMap).length === 0 && this.moreDevices === 0) {
            this.loadMoreDevices();
          }
          // eslint-disable-next-line
          this.$store.dispatch('createSnackbar', PinStrings.$tr('pinRemoved'));
        });
      },
      handlePinToggle(instance_id) {
        if (this.userPinsMap[instance_id]) {
          this.deletePin(instance_id);
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
        this.moreDevices += 4;
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
