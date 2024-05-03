<template>

  <div>
    <KGrid gutter="0" class="grid">
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <h1 :style="{ marginLeft: '-8px' }">
          {{ injectedtr('otherLibraries') }}
        </h1>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <div class="sync-status">
          <span
            v-show="searchingOtherLibraries"
            data-test="searching"
          >
            <span data-test="searching-label">{{ injectedtr('searchingOtherLibrary') }}</span>
                &nbsp;&nbsp;
            <span>
              <KCircularLoader
                type="indeterminate"
                :stroke="6"
              />
            </span>
          </span>
          <span
            v-show="!searchingOtherLibraries && devicesWithChannelsExist"
            data-test="showing-all"
          >
            <span>
              <KIcon
                v-if="windowIsSmall"
                icon="wifi"
                class="wifi-svg"
              />
            </span>
                &nbsp;&nbsp;
            <span data-test="showing-all-label">{{ injectedtr('showingAllLibraries') }}</span>
                &nbsp;&nbsp;
            <span>
              <KIcon
                v-if="!windowIsSmall"
                icon="wifi"
                class="wifi-svg"
              />
            </span>
          </span>
          <span
            v-show="!searchingOtherLibraries && !devicesWithChannelsExist"
            data-test="no-other"
          >
            <span>
              <KIcon icon="disconnected" />
            </span>
                &nbsp;&nbsp;
            <span data-test="no-other-label">{{ injectedtr('noOtherLibraries') }}</span>
          </span>
        </div>
      </KGridItem>
    </KGrid>

    <h2
      v-if="!threeLibrariesOrFewer && pinnedDevicesExist && unpinnedDevicesExist"
      data-test="pinned-label"
      :style="{ marginLeft: '-8px' }"
    >
      {{ injectedtr('pinned') }}
    </h2>
    <FadeInTransitionGroup class="other-libraries-grid">
      <LibraryItem
        v-for="device in fullLibrariesToDisplay"
        :key="device['instance_id']"
        data-test="pinned-resources"
        :device="device"
        :channels="deviceChannelsMap[device['instance_id']]"
        :channelsToDisplay="cardsToDisplay"
        :pinned="Boolean(userPinsMap[device['instance_id']])"
        @togglePin="handlePinToggle"
      />
    </FadeInTransitionGroup>

    <!-- More  -->

    <KGrid v-if="!threeLibrariesOrFewer && unpinnedDevicesExist" class="other-libraries-grid">
      <KGridItem
        :layout12="{ span: 10 }"
        :layout8="{ span: 6 }"
        :layout4="{ span: 2 }"
      >
        <h2
          v-if="pinnedDevicesExist"
          data-test="more-label"
          :style="{ marginTop: '0px', marginLeft: '-8px' }"
        >
          {{ injectedtr('moreLibraries') }}
        </h2>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 2, alignment: 'right' }"
        :layout8="{ span: 2, alignment: 'right' }"
        :layout4="{ span: 2, alignment: 'right' }"
      >
        <KRouterLink
          appearance="raised-button"
          :text="explore$"
          :to="genExploreLibrariesPageBackLink()"
        />
      </KGridItem>
      <KGridItem
        v-for="device in unpinnedDevices.slice(0, cardsToDisplay)"
        :key="device.id"
        :layout="{ span: layoutSpan }"
      >
        <UnPinnedDevices
          data-test="more-devices"
          :device="device"
          :channelCount="deviceChannelsMap[device.instance_id].length"
          :routeTo="genLibraryPageBackLink(device.id)"
        />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import { get } from '@vueuse/core';
  import { computed } from 'kolibri.lib.vueCompositionApi';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import coreStrings from 'kolibri.utils.coreStrings';
  import useCardLayoutSpan from '../../composables/useCardLayoutSpan';
  import useContentLink from '../../composables/useContentLink';
  import useDevices from '../../composables/useDevices';
  import usePinnedDevices from '../../composables/usePinnedDevices';
  import LibraryItem from '../ExploreLibrariesPage/LibraryItem';
  import FadeInTransitionGroup from '../FadeInTransitionGroup';
  import UnPinnedDevices from './UnPinnedDevices';

  export default {
    name: 'OtherLibraries',
    components: {
      FadeInTransitionGroup,
      LibraryItem,
      UnPinnedDevices,
    },
    setup() {
      const {
        isLoadingChannels,
        networkDevicesWithChannels,
        keepDeviceChannelsUpdated,
        deviceChannelsMap,
      } = useDevices();
      const {
        handlePinToggle,
        fetchPinsForUser,
        pinnedDevices,
        unpinnedDevices,
        pinnedDevicesExist,
        unpinnedDevicesExist,
        userPinsMap,
      } = usePinnedDevices(networkDevicesWithChannels);
      const { windowIsSmall } = useKResponsiveWindow();
      const { genExploreLibrariesPageBackLink, genLibraryPageBackLink } = useContentLink();
      const { layoutSpan, makeComputedCardCount } = useCardLayoutSpan();

      keepDeviceChannelsUpdated();

      fetchPinsForUser();

      const devicesWithChannelsExist = computed(() => get(networkDevicesWithChannels).length > 0);

      // We want to display 2 rows of cards
      // but always display at least 3 cards, if available.
      const cardsToDisplay = makeComputedCardCount(2, 3);

      const threeLibrariesOrFewer = computed(() => get(networkDevicesWithChannels).length <= 3);

      // When there are three libraries or fewer, display all libraries fully.
      const fullLibrariesToDisplay = computed(() =>
        get(threeLibrariesOrFewer)
          ? [...get(pinnedDevices), ...get(unpinnedDevices)]
          : get(pinnedDevices)
      );

      // Make this conditional, as this import does not resolve properly
      // under Jest, and causes problems.
      // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
      const explore$ = coreStrings.$tr ? coreStrings.$tr('explore') : '';

      return {
        networkDevicesWithChannels,
        devicesWithChannelsExist,
        deviceChannelsMap,
        searchingOtherLibraries: isLoadingChannels,
        windowIsSmall,
        fullLibrariesToDisplay,
        pinnedDevices,
        unpinnedDevices,
        userPinsMap,
        threeLibrariesOrFewer,
        pinnedDevicesExist,
        unpinnedDevicesExist,
        handlePinToggle,
        cardsToDisplay,
        explore$,
        genExploreLibrariesPageBackLink,
        genLibraryPageBackLink,
        layoutSpan,
      };
    },
    props: {
      injectedtr: { type: Function, required: true },
    },
  };

</script>


<style lang="scss" scoped>

  .sync-status {
    display: flex;
    justify-content: flex-end;
    margin: 30px 0 10px;

    span {
      display: inline-flex;
      vertical-align: bottom;
    }
  }

  .wifi-svg {
    top: 0;
    transform: scale(1.5);
  }

  .grid {
    margin: 8px;
  }

  .other-libraries-grid {
    margin-left: 0.75em;
  }

</style>
