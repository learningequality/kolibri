<template>

  <div>
    <KGrid
      gutter="0"
      class="grid"
      style="margin-bottom:-25px ;"
    >
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <h1 :style="{ marginLeft: '-8px' }">
          {{ injectedtr('otherLibraries') }}
        </h1>
     
        <div class="sync-status" >
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
          <div class="a" v-show="!searchingOtherLibraries && !devicesWithChannelsExist" >
          <span
            
            data-test="no-other"
            
          > <div  >
            <span >
              <KIcon class="disco"  icon="disconnected" />
            </span >
          </div>
            &nbsp;&nbsp;
            <div class="b">
            <span   data-test="no-other-label">{{ injectedtr('noOtherLibraries') }}</span>
          </div>
          </span>
        </div>
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

    <KGrid
      v-if="!threeLibrariesOrFewer && unpinnedDevicesExist"
      class="other-libraries-grid"
    >
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
  import { computed } from '@vue/composition-api';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
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
          : get(pinnedDevices),
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
  margin-top: -20px;
  margin-left: 0px;
  padding-left: 10px;
  margin-bottom: 25px;
  min-width: 400px;
 
  .a {
    display: flex; 
    align-items: center; 
    margin-top: -5px; 
     margin-left: 100px; }
    
  .b {
      margin-left: 500px;
      padding-left: 00px;
      min-width: 200px;
    }
    .disco {
      margin-left: 1000px;    
    }

  span {
    margin-bottom: 10px;
    vertical-align: bottom;
    margin-top: 10px;
    display: inline-flex;
    margin-left: -8px;
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

@media screen  and (max-width: 600px)  {
  .sync-status {
  
   max-width: 400px;
   
   .a {
     margin-right: 13px;
    }
    .disco {
      margin-right: -640px; 
    }

   

   span {
      margin-left: -191px;
      word-wrap: break-word;

      
    }
  }
  .wifi-svg {
    
    margin-left: -213px;
  }
}
@media screen and (min-width: 600px) and (max-width:1100px)  {
  .sync-status {
 

   .a {

     margin-right: 13px;
    }
    .disco {
      margin-right: -640px; 
    }


    span {
      margin-left: -190px;
   
    }
  }
  .wifi-svg {
   
    margin-left: -160px;
  }
}

@media screen and (min-width: 1100px)  {
  .sync-status {
 
    span {
      margin-left: -220px;
      padding-left: -50px;
      
      
    }
    .a {

     margin-right: 50px;
    
    }
    .disco {
      margin-right: -610px; 
    
    }

    
   
  }
  .wifi-svg {
   
    margin-left: -140px;
  }
  
}

</style>
