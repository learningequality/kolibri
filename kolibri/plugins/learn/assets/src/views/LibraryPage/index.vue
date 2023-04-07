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
        <div v-if="!deviceId">
          <KGrid gutter="12">
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
              <div v-if="searching" class="sync-status">
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
        </div>
        <PinnedNetworkResources
          v-if="pinnedDevices"
          :pinnedDevices="pinnedDevices"
        />
        <!-- More  -->
        <div v-if="!deviceId">
          <h2>{{ $tr('moreLibraries') }}</h2>
          <MoreNetworkDevices
            v-if="unPinnedDevices"
            :devices="unPinnedDevices"
          >
            <KGrid>
              <KGridItem
                :layout="{ span: cardColumnSpan,alignment: 'auto' }"
                class="view-all-card"
                style=""
              >
                <div
                  class="card-main-wrapper"
                  :style="cardStyle"
                  @click="viewAll"
                >
                  <TextTruncator
                    :text="coreString('viewAll')"
                    :maxHeight="52"
                    class="view-all-text"
                  />
                </div>
              </KGridItem>
            </KGrid>
          </MoreNetworkDevices>
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
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import SidePanelModal from '../SidePanelModal';
  import { KolibriStudioId, PageNames } from '../../constants';
  import useCardViewStyle from '../../composables/useCardViewStyle';
  import useDevices from '../../composables/useDevices';
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
      TextTruncator,
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

      onMounted(() => {
        const keywords = currentRoute().query.keywords;
        if (keywords && keywords.length) {
          search(keywords);
        }
      });

      const { currentCardViewStyle } = useCardViewStyle();

      const { baseurl, deviceName, fetchDevices } = useDevices();

      const { fetchChannels } = useChannels();

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
        pinnedDevices: [],
        unPinnedDevices: [],
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
          if (this.deviceId === KolibriStudioId) {
            return this.learnString('kolibriLibrary');
          } else {
            return this.$tr('libraryOf', { device: this.deviceName });
          }
        } else {
          return this.coreString('channelsLabel');
        }
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
      gridOffset() {
        return this.isRtl
          ? { marginRight: `${this.sidePanelWidth + 24}px` }
          : { marginLeft: `${this.sidePanelWidth + 24}px` };
      },
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          marginBottom: `${this.windowGutter}px`,
          minHeight: `${this.overallHeight}px`,
          textAlign: 'center',
        };
      },
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
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
        this.fetchDevices().then(devices => {
          const storeUnpinnedDevices = [];
          this.devices = devices.filter(d => d.available);
          this.devices.forEach(device => {
            this.fetchChannels({ baseurl: device.base_url }).then(channel => {
              if (channel.length > 0) {
                this.$set(device, 'channels', channel);
                this.pinnedDevices.push(device);
                storeUnpinnedDevices.push(device);
              }
            });
          });
          this.setLimitToDevices(storeUnpinnedDevices);
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
      setLimitToDevices(devices) {
        // TODO - Ensuring that the display of devices is
        // limited to 4 devices before the view all card is clicked
        this.unPinnedDevices = devices;
      },
      viewAll() {
        return this.$router.push({ name: PageNames.EXPLORE_LIBRARIES });
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

  .view-all-card {
    width: 365px;
    height: 150px;
    margin-left: 10px;
    cursor: pointer;
  }

</style>
