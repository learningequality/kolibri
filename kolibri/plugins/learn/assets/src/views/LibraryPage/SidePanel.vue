<template>

  <!-- This v-if ensures we don't render an unnecessary empty div
    something will always be showing if one of these is true
  -->
  <div v-if="windowIsLarge || mobileSidePanelIsOpen">
    <!-- Embedded Side panel is on larger views, and exists next to content -->
    <EmbeddedSidePanel
      v-if="windowIsLarge"
      v-model="searchTerms"
      data-test="desktop-search-side-panel"
      :width="`${sidePanelWidth}px`"
      :availableLabels="labels"
      position="embedded"
      :activeActivityButtons="searchTerms.learning_activities"
      :activeCategories="searchTerms.categories"
      @currentCategory="handleCategory"
    />
    <!-- The full screen side panel is used on smaller screens, and toggles as an overlay -->
    <!-- FullScreen is a container component, and then the EmbeddedSidePanel sits within -->
    <FullScreenSidePanel
      v-else-if="mobileSidePanelIsOpen"
      class="full-screen-side-panel"
      data-test="filters-side-panel"
      alignment="left"
      :sidePanelOverrideWidth="`${sidePanelOverlayWidth}px`"
      @closePanel="$emit('toggleMobileSidePanel')"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <KIconButton
        v-if="(windowIsSmall || windowIsMedium) && currentCategory"
        icon="back"
        :ariaLabel="coreString('goBackAction')"
        :color="$themeTokens.text"
        :tooltip="coreString('goBackAction')"
        @click="closeCategoryModal"
      />
      <EmbeddedSidePanel
        v-if="!currentCategory"
        ref="embeddedPanel"
        v-model="searchTerms"
        :width="`${sidePanelOverlayWidth}px`"
        :availableLabels="labels"
        position="overlay"
        :activeActivityButtons="searchTerms.learning_activities"
        :activeCategories="searchTerms.categories"
        @currentCategory="handleCategory"
      />
      <CategorySearchModal
        v-if="currentCategory && (windowIsSmall || windowIsMedium)"
        ref="searchModal"
        :selectedCategory="currentCategory"
        :numCols="numCols"
        :availableLabels="labels"
        position="fullscreen"
        @cancel="currentCategory = null"
        @input="handleCategory"
      />
    </FullScreenSidePanel>

    <!-- Category Search modal for large screens. On smaller screens, it is -->
    <!-- contained within the full screen search modal (different design) -->
    <CategorySearchModal
      v-if="windowIsLarge && currentCategory"
      ref="searchModal"
      :selectedCategory="currentCategory"
      :numCols="numCols"
      :availableLabels="labels"
      position="modal"
      @cancel="currentCategory = null"
      @input="handleCategory"
    />
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FullScreenSidePanel from 'kolibri.coreVue.components.FullScreenSidePanel';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useSearch from '../../composables/useSearch';
  import CategorySearchModal from '../CategorySearchModal';
  import EmbeddedSidePanel from '../EmbeddedSidePanel';

  export default {
    name: 'SidePanel',
    components: {
      CategorySearchModal,
      EmbeddedSidePanel,
      FullScreenSidePanel,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const { labels, searchTerms, setCategory } = useSearch();

      var currentCategory = null;
      const closeCategoryModal = () => (currentCategory = null);
      const handleCategory = category => {
        setCategory(category);
        closeCategoryModal();
      };

      const embeddedPanel = ref(null);
      const searchModal = ref(null);

      // focusFirstEl is a public method on both of these refs' components
      const findFirstEl = () => {
        if (embeddedPanel) {
          embeddedPanel.value.focusFirstEl();
        } else {
          searchModal.value.focusFirstEl();
        }
      };

      return {
        currentCategory,
        closeCategoryModal,
        embeddedPanel,
        searchModal,
        findFirstEl,
        handleCategory,
        labels,
        searchTerms,
      };
    },
    props: {
      mobileSidePanelIsOpen: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      sidePanelWidth() {
        if (this.windowIsSmall || this.windowIsMedium) {
          return 0;
        } else if (this.windowBreakpoint < 4) {
          return 234;
        } else {
          return 346;
        }
      },
      sidePanelOverlayWidth() {
        if (!this.windowIsSmall) {
          return 364;
        }
        return null;
      },
    },
  };

</script>
