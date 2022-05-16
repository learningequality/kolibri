<template>

  <!-- This v-if ensures we don't render an unnecessary empty div
    something will always be showing if one of these is true
  -->
  <div v-if="windowIsLarge || mobileSidePanelIsOpen">
    <!-- Embedded Side panel is on larger views, and exists next to content -->
    <SearchFiltersPanel
      v-if="windowIsLarge"
      :value="searchTerms"
      data-test="desktop-search-side-panel"
      :width="`${sidePanelWidth}px`"
      :availableLabels="labels"
      position="embedded"
      :activeActivityButtons="searchTerms.learning_activities"
      :activeCategories="searchTerms.categories"
      @input="val => $emit('setSearchTerms', val)"
      @currentCategory="handleCategory"
    />
    <!-- The full screen side panel is used on smaller screens, and toggles as an overlay -->
    <!-- FullScreen is a container component, and then the SearchFiltersPanel sits within -->
    <SidePanelModal
      v-else-if="mobileSidePanelIsOpen"
      class="full-screen-side-panel"
      data-test="filters-side-panel"
      alignment="left"
      :sidePanelOverrideWidth="`${sidePanelOverlayWidth}px`"
      :closeButtonIconType="closeButtonIcon"
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
      <SearchFiltersPanel
        v-if="!currentCategory"
        ref="embeddedPanel"
        :value="searchTerms"
        :width="`${sidePanelOverlayWidth}px`"
        :availableLabels="labels"
        position="overlay"
        :activeActivityButtons="searchTerms.learning_activities"
        :activeCategories="searchTerms.categories"
        @input="val => $emit('setSearchTerms', val)"
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
    </SidePanelModal>

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
  import SidePanelModal from 'kolibri.coreVue.components.SidePanelModal';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CategorySearchModal from '../CategorySearchModal';
  import SearchFiltersPanel from '../SearchFiltersPanel';

  export default {
    name: 'SidePanel',
    components: {
      CategorySearchModal,
      SearchFiltersPanel,
      SidePanelModal,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    /* eslint-disable-next-line no-unused-vars */
    setup(props, context) {
      var currentCategory = ref(null);
      const closeCategoryModal = () => (currentCategory.value = null);
      const handleCategory = category => {
        context.emit('setCategory', category);
        currentCategory.value = category;
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
        closeCategoryModal,
        currentCategory,
        embeddedPanel,
        searchModal,
        findFirstEl,
        handleCategory,
      };
    },
    props: {
      labels: {
        type: Object,
        default: () => {},
      },
      mobileSidePanelIsOpen: {
        type: Boolean,
        default: false,
      },
      searchTerms: {
        type: Object,
        default: () => {},
      },
    },
    computed: {
      closeButtonIcon() {
        return (this.windowIsSmall || this.windowIsMedium) && this.currentCategory
          ? 'back'
          : 'close';
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
      sidePanelOverlayWidth() {
        if (!this.windowIsSmall) {
          return 364;
        }
        return null;
      },
    },
    watch: {
      searchTerms(val) {
        this.$emit('searchTerms', val);
      },
    },
  };

</script>
