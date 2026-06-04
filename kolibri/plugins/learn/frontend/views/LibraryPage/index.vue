<template>

  <div :style="{ maxWidth: '1700px', margin: '0 auto' }">
    <transition name="delay-entry">
      <PostSetupModalGroup
        v-if="
          !(rootNodesLoading || searchLoading) && welcomeModalVisible && !picturePasswordPending
        "
        isOnMyOwnUser
        @cancel="hideWelcomeModal"
      />
      <MeteredConnectionNotificationModal
        v-else-if="usingMeteredConnection"
        @update="value => (allowDownloadOnMeteredConnection = value)"
      />
    </transition>
    <LearnAppBarPage
      :appBarTitle="appBarTitle"
      :loading="rootNodesLoading"
      :appearanceOverrides="wrapperStyles"
      :deviceId="deviceId"
      :route="back"
    >
      <main class="main-grid">
        <!-- Search header: search bar + filter pills grouped together -->
        <div
          class="search-header"
          :style="{
            backgroundColor: $themeTokens.surface,
            borderColor: $themePalette.grey.v_200,
          }"
        >
          <LibrarySearchBar
            v-if="!isLocalLibraryEmpty || deviceId"
            data-testid="library-search-bar"
          />

          <HorizontalFilterPills
            v-if="!rootNodesLoading && (!isLocalLibraryEmpty || deviceId)"
            data-testid="horizontal-filter-pills"
            @openFilters="showFilterModal = true"
          />
        </div>

        <!--
          - If search is loading, show loader.
          - If there are no search results, show channels and resumable
          content.
          - Otherwise, show search results.
        -->
        <KCircularLoader
          v-if="rootNodesLoading || searchLoading"
          class="loader"
          type="indeterminate"
          :delay="false"
        />
        <div
          v-else-if="!displayingSearchResults && !rootNodesLoading"
          data-testid="channels"
        >
          <div>
            <h1
              v-if="!isLocalLibraryEmpty"
              class="channels-label"
            >
              {{ channelsLabel }}
            </h1>
            <div
              v-else-if="
                isLocalLibraryEmpty && isNetworkLibraryAvailable && !isLoadingNetworkLibraries
              "
            >
              <h1 class="channels-label">
                {{ channelsLabel }}
              </h1>
              <p
                data-testid="nothing-in-lib-label"
                class="nothing-in-lib-label"
              >
                {{ coreString('nothingInLibraryLearner') }}
              </p>
            </div>
            <NoResourcePage v-else />
          </div>

          <ChannelCardGroupGrid
            v-if="!isLocalLibraryEmpty"
            data-testid="channel-cards"
            class="grid"
            :contents="rootNodes"
            :deviceId="deviceId"
          />
          <!-- ResumableContentGrid mostly handles whether it renders or not internally !-->
          <!-- but we conditionalize it based on whether we are on another device's library page!-->
          <ResumableContentGrid
            v-if="!deviceId"
            data-testid="resumable-content"
            :currentCardViewStyle="currentCardViewStyle"
            @setCardStyle="style => (currentCardViewStyle = style)"
            @setSidePanelMetadataContent="content => (metadataSidePanelContent = content)"
          />
          <!-- Other Libraries -->
          <OtherLibraries
            v-if="showOtherLibraries"
            data-testid="other-libraries"
            :injectedtr="injecttr"
            @availableNetworkDevices="availableNetworkDevices"
            @isLoadingLibraries="isLoadingLibraries"
          />
        </div>

        <SearchResultsGrid
          v-else-if="displayingSearchResults"
          data-testid="search-results"
          :allowDownloads="allowDownloads"
          :results="results"
          :moreLoading="moreLoading"
          :searchMore="searchMore"
          :currentCardViewStyle="currentCardViewStyle"
          :searchLoading="searchLoading"
          :more="more"
          @setCardStyle="style => (currentCardViewStyle = style)"
          @setSidePanelMetadataContent="content => (metadataSidePanelContent = content)"
        />
      </main>

      <!-- All filters side panel -->
      <SearchFiltersSidePanel
        v-if="showFilterModal"
        @close="showFilterModal = false"
      />

      <!-- Side Panel for metadata -->
      <SidePanelModal
        v-if="metadataSidePanelContent && !rootNodesLoading"
        data-testid="side-panel-modal"
        alignment="right"
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
            :class="
              $computedClass({
                '::after': {
                  content: '',
                  flex: 'auto',
                },
              })
            "
          >
            <LearningActivityChip
              class="chip"
              :kind="activity"
            />
          </div>
        </template>

        <BrowseResourceMetadata
          ref="resourcePanel"
          :content="metadataSidePanelContent"
          :showLocationsInChannel="true"
          :canDownloadExternally="canDownloadExternally && !deviceId"
        />
      </SidePanelModal>
      <TooltipTour
        v-if="tourActive && isTourActive('LibraryPage') && hasRole"
        page="LibraryPage"
        @tourEnded="endTour('LibraryPage')"
      />
    </LearnAppBarPage>
  </div>

</template>


<script>

  import { get, set, useSessionStorage } from '@vueuse/core';

  import { getCurrentInstance, ref, watch } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import pluginData from 'kolibri-plugin-data';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import useNav from 'kolibri/composables/useNav';
  import { handleApiError, clearError } from 'kolibri/utils/appError';
  import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import { mapState } from 'vuex';
  import checkMeteredConnection from 'kolibri-common/utils/checkMeteredConnection';
  import LearningActivityChip from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityChip.vue';
  import { searchKeys } from 'kolibri-common/composables/useBaseSearch';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import useChannels from 'kolibri-common/composables/useChannels';
  import TooltipTour from 'kolibri/components/onboarding/TooltipTour';
  import useTour from 'kolibri/composables/useTour';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import { PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING } from 'kolibri-common/constants/Auth';
  import SearchFiltersSidePanel from '../SearchFiltersSidePanel';
  import { KolibriStudioId, PageNames } from '../../constants';
  import useCardViewStyle from '../../composables/useCardViewStyle';
  import useContentLink from '../../composables/useContentLink';
  import useCoreLearn from '../../composables/useCoreLearn';
  import useDeviceSettings from '../../composables/useDeviceSettings';
  import {
    currentDeviceData,
    setCurrentDevice,
    StudioNotAllowedError,
  } from '../../composables/useDevices';
  import useSearch from '../../composables/useSearch';
  import useLearnerResources from '../../composables/useLearnerResources';
  import BrowseResourceMetadata from '../BrowseResourceMetadata';
  import commonLearnStrings from '../commonLearnStrings';
  import ChannelCardGroupGrid from '../ChannelCardGroupGrid';
  import SearchResultsGrid from '../SearchResultsGrid';
  import LearnAppBarPage from '../LearnAppBarPage';
  import PostSetupModalGroup from '../../../../device/frontend/views/PostSetupModalGroup.vue';
  import HorizontalFilterPills from './HorizontalFilterPills';
  import LibrarySearchBar from './LibrarySearchBar';
  import MeteredConnectionNotificationModal from './MeteredConnectionNotificationModal.vue';
  import ResumableContentGrid from './ResumableContentGrid';
  import OtherLibraries from './OtherLibraries';
  import NoResourcePage from './NoResourcePage';

  const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

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
      MeteredConnectionNotificationModal,
      ResumableContentGrid,
      SearchResultsGrid,
      SearchFiltersSidePanel,
      LearnAppBarPage,
      OtherLibraries,
      PostSetupModalGroup,
      NoResourcePage,
      TooltipTour,
      LibrarySearchBar,
      HorizontalFilterPills,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup(props) {
      const currentInstance = getCurrentInstance().proxy;
      const store = currentInstance.$store;
      const router = currentInstance.$router;
      const { tourActive, isTourActive, startTour, endTour, resumeTour } = useTour();
      const { isUserLoggedIn, hasRole, currentUserId } = useUser();
      const picturePasswordPending = useSessionStorage(
        PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING,
        false,
      );
      const { allowDownloadOnMeteredConnection } = useDeviceSettings();
      const { windowIsSmall } = useKResponsiveWindow();
      const {
        searchTerms,
        displayingSearchResults,
        searchLoading,
        moreLoading,
        results,
        more,
        search,
        searchMore,
        currentRoute,
      } = useSearch();
      search();
      const { fetchResumableContentNodes } = useLearnerResources();

      const { topBarHeight } = useNav();
      const { canAddDownloads, canDownloadExternally } = useCoreLearn();
      const { currentCardViewStyle } = useCardViewStyle();
      const { back } = useContentLink();
      const { deviceName } = currentDeviceData();
      const { fetchChannels } = useChannels();

      const rootNodes = ref([]);
      const rootNodesLoading = ref(false);

      function _showChannels(channels, baseurl) {
        if (get(isUserLoggedIn) && !baseurl) {
          fetchResumableContentNodes();
        }
        const shouldResolve = samePageCheckGenerator();
        return ContentNodeResource.fetchCollection({
          getParams: {
            parent__isnull: true,
            include_coach_content: get(hasRole),
            baseurl,
          },
        }).then(
          channelCollection => {
            if (shouldResolve()) {
              // we want them to be in the same order as the channels list
              set(
                rootNodes,
                channels
                  .map(channel => {
                    const node = channelCollection.find(n => n.channel_id === channel.id);
                    if (node) {
                      // The `channel` comes with additional data that is
                      // not returned from the ContentNodeResource.
                      // Namely thumbnail, description and tagline (so far)
                      node.title = channel.name || node.title;
                      node.thumbnail = channel.thumbnail;
                      node.description = channel.tagline || channel.description;
                      return node;
                    }
                  })
                  .filter(Boolean),
              );

              pageLoading.value = false;
              clearError();
              store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
              set(rootNodesLoading, false);
            }
          },
          error => {
            pageLoading.value = false;
            if (shouldResolve()) {
              handleApiError({ error, reloadOnReconnect: true });
            }
            set(rootNodesLoading, false);
          },
        );
      }

      function _showLibrary(baseurl) {
        return fetchChannels({ baseurl }).then(channels => {
          if (!channels.length && baseurl) {
            router.replace({ name: PageNames.LIBRARY });
            return;
          }

          const query = currentRoute().query;

          if (searchKeys.some(key => query[key])) {
            // If currently on a route with search terms
            // just finish early and let the component handle loading
            pageLoading.value = false;
            clearError();
            store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
            set(rootNodesLoading, false);
            return Promise.resolve();
          }
          return _showChannels(channels, baseurl);
        });
      }

      function showLibrary() {
        set(rootNodesLoading, true);
        pageLoading.value = true;
        if (props.deviceId) {
          return setCurrentDevice(props.deviceId)
            .then(device => {
              const baseurl = device.base_url;
              // _showLibrary should unset the rootNodesLoading
              return _showLibrary(baseurl);
            })
            .catch(error => {
              if (error === StudioNotAllowedError) {
                router.replace({ name: PageNames.LIBRARY });
                return;
              }
              return Promise.reject(error);
            });
        }
        return _showLibrary();
      }

      watch(() => props.deviceId, showLibrary);

      watch(displayingSearchResults, () => {
        if (!displayingSearchResults.value && !rootNodes.value.length) {
          showLibrary();
        }
      });

      showLibrary();

      return {
        allowDownloadOnMeteredConnection,
        canAddDownloads,
        canDownloadExternally,
        windowIsSmall,
        searchTerms,
        displayingSearchResults,
        searchLoading,
        moreLoading,
        results,
        more,
        searchMore,
        currentCardViewStyle,
        deviceName,
        back,
        rootNodesLoading,
        rootNodes,
        pageLoading,
        isUserLoggedIn,
        hasRole,
        tourActive,
        isTourActive,
        startTour,
        endTour,
        resumeTour,
        picturePasswordPending,
        userId: currentUserId,
        topBarHeight,
      };
    },
    props: {
      deviceId: {
        type: String,
        default: null,
      },
    },
    data: function () {
      return {
        isLocalLibraryEmpty: false,
        metadataSidePanelContent: null,
        showFilterModal: false,
        usingMeteredConnection: true,
        isNetworkLibraryAvailable: true,
        isLoadingNetworkLibraries: true,
      };
    },
    computed: {
      ...mapState({
        welcomeModalVisibleState: 'welcomeModalVisible',
      }),
      allowDownloads() {
        return this.canAddDownloads && Boolean(this.deviceId);
      },
      appBarTitle() {
        return this.learnString(this.deviceId ? 'exploreLibraries' : 'learnLabel');
      },
      wrapperStyles() {
        // ImmersivePage (used when there is a deviceId) replaces its wrapper styles
        // with these overrides rather than merging them, so clear its fixed toolbar
        // ourselves. AppBarPage merges its own padding in, so nothing is needed there.
        return this.deviceId ? { paddingTop: `${this.topBarHeight}px` } : {};
      },
      welcomeModalVisible() {
        return (
          this.welcomeModalVisibleState &&
          window.localStorage.getItem(`${welcomeDismissalKey}-${this.userId}`) !== 'true'
        );
      },
      showOtherLibraries() {
        const validUser = !this.deviceId && this.isUserLoggedIn;
        if (!validUser) {
          return false;
        }
        if (!pluginData.canCheckMeteredConnection) {
          return true;
        }
        if (this.allowDownloadOnMeteredConnection) {
          return true;
        }
        return !this.usingMeteredConnection;
      },
      channelsLabel() {
        if (this.deviceId) {
          if (this.deviceId === this.studioId) {
            return this.learnString('kolibriLibrary');
          } else {
            return this.$tr('libraryOf', { device: this.deviceName });
          }
        } else {
          return this.coreString('yourLibrary');
        }
      },
      studioId() {
        return KolibriStudioId;
      },
    },
    watch: {
      rootNodes(newNodes) {
        this.isLocalLibraryEmpty = !newNodes.length;
      },
      searchTerms() {
        // On small screens the filter panel fills the viewport, hiding the
        // results it affects, so collapse it once a filter is applied. On
        // larger screens it sits beside the results and stays open.
        if (this.windowIsSmall) {
          this.showFilterModal = false;
        }
      },
      pageLoading(newVal, oldVal) {
        if (oldVal && !newVal) {
          const isTourStarted = this.resumeTour(this.userId, 'LibraryPage');
          if (isTourStarted) {
            setTimeout(() => {
              this.startTour('LibraryPage');
            }, 3000);
          }
        }
      },
    },
    created() {
      const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

      if (window.sessionStorage.getItem(`${welcomeDismissalKey}-${this.userId}`) !== 'true') {
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', true);
      }

      // parallels logic for showOtherLibraries
      if (
        !this.deviceId &&
        this.isUserLoggedIn &&
        !this.allowDownloadOnMeteredConnection &&
        pluginData.canCheckMeteredConnection
      ) {
        checkMeteredConnection().then(isMetered => {
          this.usingMeteredConnection = isMetered;
        });
      }
    },
    methods: {
      hideWelcomeModal() {
        window.localStorage.setItem(`${welcomeDismissalKey}-${this.userId}`, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
        this.startTour('LibraryPage');
      },
      findFirstEl() {
        this.$refs.resourcePanel.focusFirstEl();
      },
      injecttr(...args) {
        return this.$tr(...args);
      },
      availableNetworkDevices(e) {
        this.isNetworkLibraryAvailable = e;
      },
      isLoadingLibraries(isLoading) {
        this.isLoadingNetworkLibraries = isLoading;
      },
    },
    $trs: {
      libraryOf: {
        message: 'Library of {device}',
        context: 'A header for a device Library',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      // These are mostly used in the OtherLibraries component and passed in from here.
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
      /* eslint-enable kolibri/vue-no-unused-translations */
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
      @extend %dropshadow-6dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .main-grid {
    padding: 0 24px 96px;
  }

  .channels-label {
    margin-bottom: 12px;
  }

  .nothing-in-lib-label {
    padding-top: 0;
    margin-top: 0;
  }

  .loader {
    margin-top: 60px;
  }

  .side-panel-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-top: 8px;
    margin-left: -8px;
  }

  .chip {
    margin-bottom: 8px;
    margin-left: 8px;
  }

  .search-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
    // Bleed the white band and its bottom divider across the page container
    // while keeping the contents aligned with the grid padding
    padding: 24px;
    margin: 0 -24px 24px;
    border-bottom: 1px solid;
  }

</style>
