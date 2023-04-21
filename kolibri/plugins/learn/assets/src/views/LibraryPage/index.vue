<template>

  <LearnAppBarPage
    :appBarTitle="appBarTitle"
    :appearanceOverrides="{}"
    :loading="loading"
    :deviceId="deviceId"
    :route="backRoute"
  >
    <main
      class="main-grid"
      :style="gridOffset"
    >
      <div v-if="!windowIsLarge">
        <KButton
          icon="filter"
          data-test="filter-button"
          :text="coreString('filter')"
          :primary="false"
          @click="toggleSidePanelVisibility"
        />
      </div>
      <!--
        - If search is loading, show loader.
        - If there are no search results, show channels and resumable
        content.
        - Otherwise, show search results.
      -->
      <KCircularLoader
        v-if="searchLoading"
        class="loader"
        type="indeterminate"
        :delay="false"
      />
      <div v-else-if="!displayingSearchResults">
        <h2>{{ channelsLabel }}</h2>
        <ChannelCardGroupGrid
          v-if="rootNodes.length"
          data-test="channel-cards"
          class="grid"
          :contents="rootNodes"
        />
        <!-- ResumableContentGrid mostly handles whether it renders or not internally !-->
        <!-- but we conditionalize it based on whether we are on another device's library page !-->
        <ResumableContentGrid
          v-if="!deviceId"
          :currentCardViewStyle="currentCardViewStyle"
          @setCardStyle="style => currentCardViewStyle = style"
          @setSidePanelMetadataContent="content => metadataSidePanelContent = content"
        />
        <!-- Other Libraires -->
        <div v-if="!deviceId && isUserLoggedIn">
          <KGrid
            gutter="12"
            :debug="true"
          >
            <KGridItem
              :layout12="{ span: 6 }"
              :layout8="{ span: 4 }"
              :layout4="{ span: 4 }"
            >
              <h1>
                {{ $tr('otherLibraries') }}
              </h1>
            </KGridItem>
            <KGridItem
              :layout12="{ span: 6 }"
              :layout8="{ span: 4 }"
              :layout4="{ span: 4 }"
              class="sync-display"
            >
              <div
                v-if="searching"
                class="sync-status"
              >
                <span>
                  {{ $tr('searchingOtherLibrary') }}
                </span>
                <span>
                  <KButton appearance="basic-link">
                    {{ coreString('refresh') }}
                  </KButton>
                  <KIcon icon="wifi" />
                </span>
              </div>
              <div v-else>
                {{ coreString('viewMoreAction') }}
                {{ $tr('pinned') }}
                {{ $tr('showingAllLibraries') }}
                {{ $tr('noOtherLibraries') }}
                {{ $tr('searchingOtherLibrary') }}
              </div>
            </KGridItem>
          </KGrid>

          <h2 v-if="pinnedDevicesExist">
            {{ $tr('pinned') }}
          </h2>
          <PinnedNetworkResources
            v-if="pinnedDevicesExist"
            :devices="pinnedDevices"
          />

          <!-- More  -->
          <h2 v-if="pinnedDevicesExist && unpinnedDevicesExist">
            {{ $tr('moreLibraries') }}
          </h2>
          <MoreNetworkDevices
            v-if="unpinnedDevicesExist"
            :devices="unpinnedDevices"
          />
        </div>

      </div>

      <SearchResultsGrid
        v-else-if="displayingSearchResults"
        :results="results"
        :removeFilterTag="removeFilterTag"
        :clearSearch="clearSearch"
        :moreLoading="moreLoading"
        :searchMore="searchMore"
        :currentCardViewStyle="currentCardViewStyle"
        :searchTerms="searchTerms"
        :searchLoading="searchLoading"
        :more="more"
        @setCardStyle="style => currentCardViewStyle = style"
        @setSidePanelMetadataContent="content => metadataSidePanelContent = content"
      />
    </main>

    <!-- Side Panels for filtering and searching  -->
    <SidePanel
      ref="sidePanel"
      :searchTerms="searchTerms"
      :mobileSidePanelIsOpen="mobileSidePanelIsOpen"
      @toggleMobileSidePanel="toggleSidePanelVisibility"
      @setSearchTerms="newTerms => searchTerms = newTerms"
      @setCategory="category => setCategory(category)"
    />

    <!-- Side Panel for metadata -->
    <SidePanelModal
      v-if="metadataSidePanelContent"
      data-test="content-side-panel"
      alignment="right"
      :closeButtonIconType="close"
      @closePanel="metadataSidePanelContent = null"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <template
        v-if="metadataSidePanelContent.learning_activities.length"
        #header
      >
        <!-- Flex styles tested in ie11 and look good. Ensures good spacing between
            multiple chips - not a common thing but just in case -->
        <div
          v-for="activity in metadataSidePanelContent.learning_activities"
          :key="activity"
          class="side-panel-chips"
          :class="$computedClass({ '::after': {
            content: '',
            flex: 'auto'
          } })"
        >
          <LearningActivityChip
            class="chip"
            style="margin-left: 8px; margin-bottom: 8px;"
            :kind="activity"
          />
        </div>
      </template>

      <BrowseResourceMetadata
        ref="resourcePanel"
        :content="metadataSidePanelContent"
        :showLocationsInChannel="true"
      />
    </SidePanelModal>
  </LearnAppBarPage>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';

  import { onMounted } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import SidePanelModal from '../SidePanelModal';
  import { KolibriStudioId, PageNames } from '../../constants';
  import useCardViewStyle from '../../composables/useCardViewStyle';
  import useDevices from '../../composables/useDevices';
  import usePinnedDevices from '../../composables/usePinnedDevices';
  import useSearch from '../../composables/useSearch';
  import useLearnerResources from '../../composables/useLearnerResources';
  import BrowseResourceMetadata from '../BrowseResourceMetadata';
  import commonLearnStrings from '../commonLearnStrings';
  import ChannelCardGroupGrid from '../ChannelCardGroupGrid';
  import LearningActivityChip from '../LearningActivityChip';
  import SearchResultsGrid from '../SearchResultsGrid';
  import LearnAppBarPage from '../LearnAppBarPage';
  import useChannels from './../../composables/useChannels';
  import ResumableContentGrid from './ResumableContentGrid';
  import PinnedNetworkResources from './PinnedNetworkResources';
  import MoreNetworkDevices from './MoreNetworkDevices';
  import SidePanel from './SidePanel';

  export default {
    name: 'LibraryPage',
    metaInfo() {
      return {
        title: this.learnString('learnLabel'),
      };
    },
    components: {
      BrowseResourceMetadata,
      ChannelCardGroupGrid,
      SidePanelModal,
      LearningActivityChip,
      ResumableContentGrid,
      SearchResultsGrid,
      SidePanel,
      LearnAppBarPage,
      PinnedNetworkResources,
      MoreNetworkDevices,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const {
        searchTerms,
        displayingSearchResults,
        searchLoading,
        moreLoading,
        results,
        more,
        search,
        searchMore,
        removeFilterTag,
        clearSearch,
        setCategory,
        currentRoute,
      } = useSearch();
      const {
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
      } = useLearnerResources();
      const {
        windowBreakpoint,
        windowIsLarge,
        windowIsMedium,
        windowIsSmall,
      } = useKResponsiveWindow();
      const { currentCardViewStyle } = useCardViewStyle();
      const { baseurl, deviceName, fetchDevices } = useDevices();
      const { fetchChannels } = useChannels();
      const { fetchPinsForUser } = usePinnedDevices();

      onMounted(() => {
        const keywords = currentRoute().query.keywords;
        if (keywords && keywords.length) {
          search(keywords);
        }
      });

      return {
        displayingSearchResults,
        searchTerms,
        searchLoading,
        moreLoading,
        results,
        more,
        search,
        searchMore,
        removeFilterTag,
        clearSearch,
        setCategory,
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
        windowBreakpoint,
        windowIsLarge,
        windowIsMedium,
        windowIsSmall,
        currentCardViewStyle,
        baseurl,
        fetchDevices,
        deviceName,
        fetchChannels,
        fetchPinsForUser,
      };
    },
    props: {
      deviceId: {
        type: String,
        default: null,
      },
      loading: {
        type: Boolean,
        default: null,
      },
    },
    data: function() {
      return {
        metadataSidePanelContent: null,
        mobileSidePanelIsOpen: false,
        devices: [],
        searching: true,
        usersPins: [],
      };
    },
    computed: {
      ...mapState(['rootNodes']),
      ...mapGetters(['isUserLoggedIn']),
      appBarTitle() {
        return this.learnString(this.deviceId ? 'exploreLibraries' : 'learnLabel');
      },
      backRoute() {
        return { name: PageNames.EXPLORE_LIBRARIES };
      },
      channelsLabel() {
        if (this.deviceId) {
          if (this.deviceId === this.studioId) {
            return this.learnString('kolibriLibrary');
          } else {
            return this.$tr('libraryOf', { device: this.deviceName });
          }
        } else {
          return this.coreString('channelsLabel');
        }
      },
      devicesWithChannels() {
        //display Kolibri studio for superusers only
        return this.devices.filter(
          device =>
            device.channels?.length > 0 &&
            (device.instance_id !== this.studioId || this.isSuperuser)
        );
      },
      gridOffset() {
        return this.isRtl
          ? { marginRight: `${this.sidePanelWidth + 24}px` }
          : { marginLeft: `${this.sidePanelWidth + 24}px` };
      },
      pinnedDevices() {
        return this.devicesWithChannels.filter(device => {
          return (
            this.usersPinsDeviceIds.includes(device.instance_id) ||
            device.instance_id === this.studioId
          );
        });
      },
      pinnedDevicesExist() {
        return this.pinnedDevices.length > 0;
      },
      sidePanelWidth() {
        if (this.windowIsSmall || this.windowIsMedium) {
          return 0;
        } else if (this.windowBreakpoint < 4) {
          return 234;
        } else {
          return 346;
        }
      },
      studioId() {
        return KolibriStudioId;
      },
      unpinnedDevices() {
        return this.devicesWithChannels.filter(device => {
          return (
            !this.usersPinsDeviceIds.includes(device.instance_id) &&
            device.instance_id !== this.studioId
          );
        });
      },
      unpinnedDevicesExist() {
        return this.unpinnedDevices.length > 0;
      },
      usersPinsDeviceIds() {
        return this.usersPins.map(pin => pin.instance_id);
      },
    },
    watch: {
      searchTerms() {
        this.mobileSidePanelIsOpen = false;
      },
      mobileSidePanelIsOpen() {
        if (this.mobileSidePanelIsOpen) {
          document.documentElement.style.position = 'fixed';
          return;
        }
        document.documentElement.style.position = '';
      },
    },
    created() {
      this.search();
      if (this.isUserLoggedIn) {
        this.fetchPinsForUser().then(resp => {
          this.usersPins = resp.map(pin => {
            const instance_id = pin.instance_id.replace(/-/g, '');
            return { ...pin, instance_id };
          });
        });

        this.fetchDevices().then(devices => {
          const fetchDevicesChannels = devices.reduce((accumulator, device) => {
            const baseurl = device.base_url;
            accumulator.push(this.fetchChannels({ baseurl }));
            return accumulator;
          }, []);

          Promise.allSettled(fetchDevicesChannels).then(devicesChannels => {
            this.devices = devices.map((device, index) => {
              const deviceChannels = devicesChannels[index]?.value || [];
              device['channels'] = deviceChannels.slice(0, 4);
              device['total_count'] = deviceChannels.length;
              return device;
            });
          });
        });
      }
    },
    methods: {
      findFirstEl() {
        this.$refs.resourcePanel.focusFirstEl();
      },
      toggleSidePanelVisibility() {
        this.mobileSidePanelIsOpen = !this.mobileSidePanelIsOpen;
      },
    },
    $trs: {
      libraryOf: {
        message: 'Library of {device}',
        context: 'A header for a device Library',
      },
      otherLibraries: {
        message: 'Other libraries',
        context: 'Header for viewing other remote content Library',
      },
      searchingOtherLibrary: {
        message: 'Searching for libraries around you.',
        context: 'Connection state for showing other library',
      },
      noOtherLibraries: {
        message: 'No other libraries around you right now',
        context: 'Connection state when there is no other libraries around',
      },
      showingAllLibraries: {
        message: 'Showing all available libraries around you.',
        context: 'Connection state when the device is connected and shows other libraries',
      },
      moreLibraries: {
        message: 'More',
        context: 'Title section containing unpinned devices',
      },
      pinned: {
        message: 'Pinned',
        context: 'Sub heading for the pinned devices',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../HybridLearningContentCard/card';

  $margin: 24px;

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-flex;
    width: 100%;
    height: 130px;
    max-height: 258px;
    padding-bottom: $margin;
    text-decoration: none;
    vertical-align: top;
    border-radius: $radius;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .main-grid {
    margin-top: 140px;
    margin-right: 24px;
  }

  .loader {
    margin-top: 60px;
  }

  .side-panel-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-bottom: -8px;
    margin-left: -8px;
  }

  .chip {
    margin-bottom: 8px;
    margin-left: 8px;
  }

  .sync-status span {
    display: inline-flex;
  }

  .sync-status {
    margin-top: 20px;
    text-align: right;
  }

  .network-device-refresh {
    display: inline-block;
    margin: 0 4px;
  }

  .view-all-text {
    margin: auto;
    font-size: 16px;
  }

</style>
