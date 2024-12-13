<template>

  <div v-if="(resumableContentNodes || []).length">
    <div
      v-if="!windowIsSmall"
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
        :contents="contentCardsToDisplay"
        data-test="resumable-content-card-grid"
        class="resumable-content-card-grid"
        :currentCardViewStyle="currentCardViewStyle"
        :gridType="gridType"
        @openCopiesModal="copies => (displayedCopies = copies)"
        @toggleInfoPanel="$emit('setSidePanelMetadataContent', $event)"
      />
    </div>

    <!-- if all items in initial backend response are not already being shown -->
    <KButton
      v-if="moreContentCards && !showMoreContentCards"
      data-test="show-more-resumable-nodes-button"
      appearance="basic-link"
      @click="handleShowMoreContentCards"
    >
      {{ coreString('showMoreAction') }}
    </KButton>

    <!-- if there are 13+ recent items & the first 12 are currently visible -->
    <KButton
      v-if="moreResumableContentNodes && showMoreContentCards"
      data-test="view-more-resumable-nodes-button"
      appearance="basic-link"
      @click="fetchMoreResumableContentNodes"
    >
      {{ coreString('viewMoreAction') }}
    </KButton>

    <CopiesModal
      v-if="displayedCopies.length"
      :copies="displayedCopies"
      @closeModal="displayedCopies = []"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useLearnerResources from '../../composables/useLearnerResources';
  import CopiesModal from '../CopiesModal';
  import LibraryAndChannelBrowserMainContent from '../LibraryAndChannelBrowserMainContent';

  export default {
    name: 'ResumableContentGrid',
    components: {
      CopiesModal,
      LibraryAndChannelBrowserMainContent,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { resumableContentNodes, moreResumableContentNodes, fetchMoreResumableContentNodes } =
        useLearnerResources();

      const { windowIsSmall } = useKResponsiveWindow();
      return {
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
        windowIsSmall,
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
        showMoreContentCards: false,
        displayedCopies: [],
      };
    },
    computed: {
      numContentCardsToDisplay() {
        return this.windowBreakpoint === 2 || this.windowBreakpoint > 6 ? 4 : 3;
      },
      contentCardsToDisplay() {
        if (this.showMoreContentCards) {
          return this.resumableContentNodes;
        } else {
          return this.resumableContentNodes.slice(0, this.numContentCardsToDisplay);
        }
      },
      moreContentCards() {
        return this.resumableContentNodes.length > this.numContentCardsToDisplay;
      },
      gridType() {
        return this.windowBreakpoint > 6 ? 2 : 1;
      },
    },
    methods: {
      toggleCardView(value) {
        this.$emit('setCardStyle', value);
      },
      handleShowMoreContentCards() {
        this.showMoreContentCards = true;
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
    },
  };

</script>


<style lang="scss" scoped>

  .toggle-view-buttons {
    float: right;
  }

  .resumable-content-card-grid {
    margin-right: -8px;
    margin-left: -8px;
  }

</style>
