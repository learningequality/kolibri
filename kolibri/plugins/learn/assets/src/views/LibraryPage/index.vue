<template>

  <div :style="{ maxWidth: '1700px' }">
    <transition name="delay-entry">
      <PostSetupModalGroup
        v-if="!(rootNodesLoading || searchLoading) && welcomeModalVisible"
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
      :appearanceOverrides="{}"
      :deviceId="deviceId"
      :route="back"
    >
      <main
        class="main-grid"
        :style="gridOffset"
      >
        <div v-if="!windowIsLarge && (!isLocalLibraryEmpty || deviceId)">
          <KButton
            icon="filter"
            data-test="filter-button"
            class="filter-button"
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
          v-if="rootNodesLoading || searchLoading"
          class="loader"
          type="indeterminate"
          :delay="false"
        />
        <div
          v-else-if="!displayingSearchResults && !rootNodesLoading"
          data-test="channels"
        >
          <h1 class="channels-label">
            {{ channelsLabel }}
          </h1>
          <p
            v-if="isLocalLibraryEmpty"
            data-test="nothing-in-lib-label"
            class="nothing-in-lib-label"
          >
            {{ coreString('nothingInLibraryLearner') }}
          </p>
          <ChannelCardGroupGrid
            v-if="!isLocalLibraryEmpty"
            data-test="channel-cards"
            class="grid"
            :contents="rootNodes"
            :deviceId="deviceId"
          />
          <!-- ResumableContentGrid mostly handles whether it renders or not internally !-->
          <!-- but we conditionalize it based on whether we are on another device's library page!-->
          <ResumableContentGrid
            v-if="!deviceId"
            data-test="resumable-content"
            :currentCardViewStyle="currentCardViewStyle"
            @setCardStyle="style => (currentCardViewStyle = style)"
            @setSidePanelMetadataContent="content => (metadataSidePanelContent = content)"
          />
          <!-- Other Libraries -->
          <OtherLibraries
            v-if="showOtherLibraries"
            data-test="other-libraries"
            :injectedtr="injecttr"
          />
        </div>

        <SearchResultsGrid
          v-else-if="displayingSearchResults"
          data-test="search-results"
          :allowDownloads="allowDownloads"
          :results="results"
          :removeFilterTag="removeFilterTag"
          :clearSearch="clearSearch"
          :moreLoading="moreLoading"
          :searchMore="searchMore"
          :currentCardViewStyle="currentCardViewStyle"
          :searchTerms="searchTerms"
          :searchLoading="searchLoading"
          :more="more"
          @setCardStyle="style => (currentCardViewStyle = style)"
          @setSidePanelMetadataContent="content => (metadataSidePanelContent = content)"
        />
      </main>

      <!-- Side Panels for filtering and searching  -->
      <SearchFiltersPanel
        v-if="(!isLocalLibraryEmpty || deviceId) && (windowIsLarge || mobileSidePanelIsOpen)"
        ref="sidePanel"
        v-model="searchTerms"
        data-test="side-panel"
        :width="`${sidePanelWidth}px`"
        @close="toggleSidePanelVisibility"
      />

      <!-- Side Panel for metadata -->
      <SidePanelModal
        v-if="metadataSidePanelContent"
        data-test="side-panel-modal"
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
              style="margin-bottom: 8px; margin-left: 8px"
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
    </LearnAppBarPage>
  </div>

</template>


<script>

  import { get, set } from '@vueuse/core';

  import { onMounted, getCurrentInstance, ref, watch } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import { ContentNodeResource } from 'kolibri.resources';
  import { mapState } from 'vuex';
  import MeteredConnectionNotificationModal from 'kolibri-common/components/MeteredConnectionNotificationModal.vue';
  import appCapabilities, { checkCapability } from 'kolibri.utils.appCapabilities';
  import LearningActivityChip from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityChip.vue';
  import { searchKeys } from 'kolibri-common/composables/useBaseSearch';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import SearchFiltersPanel from 'kolibri-common/components/SearchFiltersPanel';
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
  import PostSetupModalGroup from '../../../../../device/assets/src/views/PostSetupModalGroup.vue';
  import useChannels from './../../composables/useChannels';
  import ResumableContentGrid from './ResumableContentGrid';
  import OtherLibraries from './OtherLibraries';

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
      SearchFiltersPanel,
      LearnAppBarPage,
      OtherLibraries,
      PostSetupModalGroup,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup(props) {
      const currentInstance = getCurrentInstance().proxy;
      const store = currentInstance.$store;
      const router = currentInstance.$router;

      const {
        isUserLoggedIn,
        isCoach,
        isAdmin,
        isSuperuser,
        canManageContent,
        isLearnerOnlyImport,
      } = useUser();
      const { allowDownloadOnMeteredConnection } = useDeviceSettings();
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
        fetchResumableContentNodes,
        fetchMoreResumableContentNodes,
      } = useLearnerResources();

      const { windowBreakpoint, windowIsLarge, windowIsMedium, windowIsSmall } =
        useKResponsiveWindow();
      const { canAddDownloads, canDownloadExternally } = useCoreLearn();
      const { currentCardViewStyle } = useCardViewStyle();
      const { back } = useContentLink();
      const { baseurl, deviceName } = currentDeviceData();
      const { fetchChannels } = useChannels();

      onMounted(() => {
        const keywords = currentRoute().query.keywords;
        if (keywords && keywords.length) {
          search(keywords);
        }
      });

      const rootNodes = ref([]);
      const rootNodesLoading = ref(false);

      function _showChannels(channels, baseurl) {
        if (get(isUserLoggedIn) && !baseurl) {
          fetchResumableContentNodes();
        }
        const shouldResolve = samePageCheckGenerator(store);
        return ContentNodeResource.fetchCollection({
          getParams: {
            parent__isnull: true,
            include_coach_content: get(isAdmin) || get(isCoach) || get(isSuperuser),
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

              store.commit('CORE_SET_PAGE_LOADING', false);
              store.commit('CORE_SET_ERROR', null);
              store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
              set(rootNodesLoading, false);
            }
          },
          error => {
            shouldResolve()
              ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
              : null;
            set(rootNodesLoading, false);
          },
        );
      }

      function _showLibrary(baseurl) {
        return fetchChannels({ baseurl }).then(channels => {
          if (!channels.length && isUserLoggedIn) {
            router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
            return;
          }
          if (!channels.length && baseurl) {
            router.replace({ name: PageNames.LIBRARY });
            return;
          }

          const query = currentRoute().query;

          if (searchKeys.some(key => query[key])) {
            // If currently on a route with search terms
            // just finish early and let the component handle loading
            store.commit('CORE_SET_PAGE_LOADING', false);
            store.commit('CORE_SET_ERROR', null);
            store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
            set(rootNodesLoading, false);
            return Promise.resolve();
          }
          return _showChannels(channels, baseurl);
        });
      }

      function showLibrary() {
        set(rootNodesLoading, true);
        store.commit('CORE_SET_PAGE_LOADING', true);
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
        deviceName,
        fetchChannels,
        back,
        rootNodesLoading,
        rootNodes,
        isUserLoggedIn,
        canManageContent,
        isLearnerOnlyImport,
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
        mobileSidePanelIsOpen: false,
        usingMeteredConnection: true,
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
      welcomeModalVisible() {
        return (
          this.welcomeModalVisibleState &&
          window.localStorage.getItem(welcomeDismissalKey) !== 'true' &&
          !(this.rootNodes.length > 0) &&
          this.canManageContent &&
          !this.isLearnerOnlyImport
        );
      },
      showOtherLibraries() {
        const validUser = !this.deviceId && this.isUserLoggedIn;
        if (!validUser) {
          return false;
        }
        if (!checkCapability('check_is_metered')) {
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
      gridOffset() {
        const paddingTop =
          !this.windowIsLarge && (this.isLocalLibraryEmpty || this.deviceId) ? '140px' : '110px';
        return this.isRtl
          ? { paddingRight: `${this.sidePanelWidth + 24}px`, paddingTop }
          : { paddingLeft: `${this.sidePanelWidth + 24}px`, paddingTop };
      },
      sidePanelWidth() {
        if (
          this.windowIsSmall ||
          this.windowIsMedium ||
          (this.isLocalLibraryEmpty && !this.deviceId)
        ) {
          return 0;
        } else if (this.windowBreakpoint < 5) {
          return 234;
        } else {
          return 346;
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
      const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

      this.search();
      if (window.sessionStorage.getItem(welcomeDismissalKey) !== 'true') {
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', true);
      }

      // parallels logic for showOtherLibraries
      if (
        !this.deviceId &&
        this.isUserLoggedIn &&
        !this.allowDownloadOnMeteredConnection &&
        checkCapability('check_is_metered')
      ) {
        appCapabilities.checkIsMetered().then(isMetered => {
          this.usingMeteredConnection = isMetered;
        });
      }
    },
    methods: {
      hideWelcomeModal() {
        window.localStorage.setItem(welcomeDismissalKey, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
      findFirstEl() {
        this.$refs.resourcePanel.focusFirstEl();
      },
      toggleSidePanelVisibility() {
        this.mobileSidePanelIsOpen = !this.mobileSidePanelIsOpen;
      },
      injecttr(...args) {
        return this.$tr(...args);
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
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .filter-button {
    margin-top: 30px;
  }

  .main-grid {
    padding-top: 110px;
    padding-right: 24px;
    padding-bottom: 96px;
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

</style>
