<template>

  <div v-if="(resumableContentNodes || []).length">
    <div
      v-if="!(windowIsSmall)"
      class="toggle-view-buttons"
      data-test="toggle-view-buttons"
    >
      <KIconButton
        icon="menu"
        :ariaLabel="$tr('viewAsList')"
        :color="$themeTokens.text"
        :tooltip="$tr('viewAsList')"
        :disabled="currentCardViewStyle === 'list'"
        @click="toggleCardView('list')"
      />
      <KIconButton
        icon="channel"
        :ariaLabel="$tr('viewAsGrid')"
        :color="$themeTokens.text"
        :tooltip="$tr('viewAsGrid')"
        :disabled="currentCardViewStyle === 'card'"
        @click="toggleCardView('card')"
      />
    </div>
    <div data-test="recent-content-nodes-title">
      <h2>
        {{ $tr('recent') }}
      </h2>
      <LibraryAndChannelBrowserMainContent
        :contents="resumableContentNodes"
        data-test="resumable-content-card-grid"
        :currentCardViewStyle="currentCardViewStyle"
        :gridType="1"
        @openCopiesModal="copies => displayedCopies = copies"
        @toggleInfoPanel="$emit('setSidePanelMetadataContent', $event)"
      />
    </div>
    <KButton
      v-if="(moreResumableContentNodes || []).length"
      data-test="more-resumable-nodes-button"
      appearance="basic-link"
      @click="fetchMoreResumableContentNodes"
    >
      {{ coreString('viewMoreAction') }}
    </KButton>

    <CopiesModal
      v-if="displayedCopies.length"
      :copies="displayedCopies"
      @submit="displayedCopies = []"
    />

    <!-- Other Libraires -->
    <div>
      <KGrid gutter="12">
        <KGridItem :layout="{ span: 6 }">
          <span>
            <h1>
              {{ $tr('otherLibraries') }}
            </h1>
          </span>
        </KGridItem>
        <KGridItem :layout="{ span: 6, alignment: 'right' }">
          <p style="padding-top:20px">
            {{ $tr('showOtherLibrary') }}
            <KButton appearance="basic-link">
              {{ $tr('refresh') }}
            </KButton>
            <KIcon
              icon="done"
            />
          </p>
        </KGridItem>
      </KGrid>
      <PinnedNetworkResources />
    </div>
    <!-- More  -->
    <div>
      <h2>
        {{ $tr('moreLibraries') }}
      </h2>
      <MoreNetworkDevices />
    </div>
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useLearnerResources from '../../composables/useLearnerResources';
  import CopiesModal from '../CopiesModal';
  import LibraryAndChannelBrowserMainContent from '../LibraryAndChannelBrowserMainContent';
  import PinnedNetworkResources from './PinnedNetworkResources';
  import MoreNetworkDevices from './MoreNetworkDevices';

  export default {
    name: 'ResumableContentGrid',
    components: {
      CopiesModal,
      LibraryAndChannelBrowserMainContent,
      PinnedNetworkResources,
      MoreNetworkDevices,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const {
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
      } = useLearnerResources();

      var sidePanelContent = ref(null);
      const toggleInfoPanel = content => (sidePanelContent.value = content);

      const activityRefs = {};

      const findFirstEl = () => {
        const activityKeys = Object.keys(activityRefs);
        const firstActivity = activityKeys.find(key => key.endsWith('0'));
        if (firstActivity) {
          activityKeys[firstActivity].value.focusFirstEl();
        }
      };

      return {
        activityRefs,
        findFirstEl,
        sidePanelContent,
        toggleInfoPanel,
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
      };
    },
    props: {
      currentCardViewStyle: {
        type: String,
        default: 'card',
      },
    },
    data() {
      return {
        displayedCopies: [],
      };
    },
    methods: {
      toggleCardView(value) {
        this.$emit('setCardStyle', value);
      },
    },
    $trs: {
      recent: {
        message: 'Recent',
        context:
          'Header for the section in the Library tab with resources that the learner recently engaged with.',
      },
      viewAsList: {
        message: 'View as list',
        context: 'Label for a button used to view resources as a list.',
      },
      viewAsGrid: {
        message: 'View as grid',
        context: 'Label for a button used to view resources as a grid.',
      },
      otherLibraries: {
        message: 'Other libraries',
        context: 'Header for viewing other remote content Library',
      },
      showOtherLibrary: {
        message: 'Showing other libraries around you.',
        context: 'Label for showing other library',
      },
      refresh: {
        message: 'Refresh',
        context: 'Link for refreshing library',
      },
      moreLibraries: {
        message: 'More',
        context: 'Title section containing unpinned devices',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .toggle-view-buttons {
    float: right;
  }

</style>
