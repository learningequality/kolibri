<template>

  <LearnAppBarPage
    :appBarTitle="learnString('learnLabel')"
    :appearanceOverrides="{}"
    :loading="loading"
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
        <h2>{{ coreString('channelsLabel') }}</h2>
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
        <div>
          <KGrid>
            <KGridItem
              :layout12="{ span: 8 }"
              :layout8="{ span: 4 }"
              :layout4="{ span: 4 }"
            >
              <h1>
                {{ $tr('otherLibraries') }}
              </h1>
            </KGridItem>
            <KGridItem
              :layout12="{ span: 4 }"
              :layout8="{ span: 4 }"
              :layout4="{ span: 4 }"
            >
              <div v-if="searching" style="padding-top:20px">
                <div class="sync-status">
                  <div>
                    {{ $tr('searchingOtherLibrary') }}
                  </div>
                  <div>
                    <KButton appearance="basic-link">
                      {{ $tr('refresh') }}
                    </KButton>
                  </div>
                  <div>
                    <KIcon
                      icon="wifi"
                    />
                  </div>
                </div>
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
        <div>
          <h2>{{ $tr('moreLibraries') }}</h2>
          <MoreNetworkDevices
            v-if="pinnedDevices"
            :devices="pinnedDevices"
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
      <template v-if="metadataSidePanelContent.learning_activities.length" #header>
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

      const { baseurl, fetchDevices } = useDevices();

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
      };
    },
    computed: {
      ...mapState(['rootNodes']),
      ...mapGetters(['isUserLoggedIn']),
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
          this.devices = devices.filter(d => d.available);
        });
      }

      this.fetchDevices().then(devices => {
        const device = devices.filter(d => d.available);
        device.forEach(element => {
          this.fetchChannels({ baseurl: element.baseurl }).then(channel => {
            this.$set(element, 'channels', channel);
            this.pinnedDevices.push(element);
          });
        });
      });
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
      refresh: {
        message: 'Refresh',
        context: 'Link for refreshing library',
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

  .main-grid {
    margin-top: 140px;
    margin-right: 24px;
  }

  .loader {
    margin-top: 60px;
  }

  .sync-status {
    display: flex;
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

</style>
