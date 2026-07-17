<template>

  <section
    :aria-label="filterAndSearchLabel$()"
    :ariaLabel="filterAndSearchLabel$()"
    :style="
      windowIsLarge
        ? {
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
          width: width,
        }
        : {}
    "
  >
    <div v-if="!currentCategory">
      <template v-if="!hideKeywords">
        <h2 class="title">
          {{ title || $tr('keywords') }}
        </h2>
        <SearchBox
          key="channel-search"
          ref="searchBox"
          style="margin-bottom: 1em"
          :disabled="searchLoading"
          :placeholder="coreString('searchByKeyword')"
          :value="activeSearchTerms.keywords || ''"
          @change="val => (activeSearchTerms = { ...activeSearchTerms, keywords: val })"
        />
      </template>

      <ActivityButtonsGroup
        v-if="showActivities"
        class="section"
        @input="handleActivity"
      />

      <AccordionSelectGroup
        v-model="inputValue"
        :showChannels="showChannels"
        :activeCategories="activeCategories"
        :handleCategory="handleCategory"
        style="margin-top: 1em"
      />
    </div>
    <div v-if="currentCategory">
      <CategorySearchModal
        ref="searchModal"
        :selectedCategory="currentCategory"
        @input="selectCategory"
      />
    </div>
  </section>

</template>


<script>

  //
  // Usage of injectBaseSearch() in this component requires ancestor's use of useBaseSearch
  // Examples of it can be found in the following components
  // (Note: useSearch extends useBaseSearch):
  // - kolibri/plugins/learn/frontend/views/LibraryPage/index.vue
  //   in https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/learn/frontend/views/LibraryPage/index.vue#L238-L251
  // - kolibri/plugins/learn/frontend/views/TopicsPage/index.vue
  //   in https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/learn/frontend/views/TopicsPage/index.vue#L366-L378
  //

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { ref } from 'vue';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import SearchBox from '../SearchBox';
  import ActivityButtonsGroup from './ActivityButtonsGroup';
  import CategorySearchModal from './CategorySearchModal';
  import AccordionSelectGroup from './AccordionSelectGroup';

  export default {
    name: 'SearchFiltersPanel',
    components: {
      SearchBox,
      ActivityButtonsGroup,
      CategorySearchModal,
      AccordionSelectGroup,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge } = useKResponsiveWindow();
      const { availableLibraryCategories, activeSearchTerms, searchLoading } = injectBaseSearch();
      const currentCategory = ref(null);
      const { filterAndSearchLabel$ } = searchAndFilterStrings;
      return {
        filterAndSearchLabel$,
        availableLibraryCategories,
        currentCategory,
        activeSearchTerms,
        searchLoading,
        windowIsLarge,
      };
    },
    props: {
      width: {
        type: [Number, String],
        required: false,
        default: null,
      },
      showChannels: {
        type: Boolean,
        default: true,
      },
      showActivities: {
        type: Boolean,
        default: true,
      },
      hideKeywords: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        default: null,
      },
    },
    computed: {
      inputValue: {
        get() {
          return this.activeSearchTerms;
        },
        set(value) {
          this.activeSearchTerms = value;
        },
      },
      activeCategories() {
        return Object.keys((this.activeSearchTerms && this.activeSearchTerms.categories) || {});
      },
    },
    watch: {
      currentCategory(val) {
        this.$emit('categorySearchOpen', val != null);
      },
    },
    methods: {
      handleActivity(activity) {
        if (activity && !this.activeSearchTerms.learning_activities[activity]) {
          const learning_activities = {
            [activity]: true,
            ...this.activeSearchTerms.learning_activities,
          };
          this.activeSearchTerms = { ...this.activeSearchTerms, learning_activities };
        } else if (activity && this.activeSearchTerms.learning_activities[activity]) {
          const learning_activities = { ...this.activeSearchTerms.learning_activities };
          delete learning_activities[activity];
          this.activeSearchTerms = { ...this.activeSearchTerms, learning_activities };
        }
      },
      setCategory(category) {
        if (this.activeSearchTerms.categories[category]) {
          const categories = { ...this.activeSearchTerms.categories };
          delete categories[category];
          this.activeSearchTerms = { ...this.activeSearchTerms, categories };
        } else {
          const categories = { [category]: true };
          for (const c in this.activeSearchTerms.categories) {
            // Filter out any subcategories of the selected category
            if (!c.startsWith(category)) {
              categories[c] = true;
            }
          }
          this.activeSearchTerms = { ...this.activeSearchTerms, categories };
        }
      },
      handleCategory(category) {
        // for categories with sub-categories, open the modal
        if (
          this.availableLibraryCategories[category] &&
          this.availableLibraryCategories[category].nested &&
          Object.keys(this.availableLibraryCategories[category].nested).length > 0
        ) {
          this.currentCategory = category;
        }
        // for valid categories with no subcategories, search directly
        else if (this.availableLibraryCategories[category]) {
          this.setCategory(this.availableLibraryCategories[category].value);
        }
      },
      selectCategory(category) {
        this.setCategory(category);
        this.currentCategory = null;
      },
      /**
       * Focuses on correct first element for FocusTrap depending on content
       * rendered in SearchFiltersPanel.
       * @public
       */
      focusFirstEl() {
        if (this.$refs.searchBox) {
          this.$refs.searchBox.focusSearchBox();
        }
      },
      /**
       * Exit the nested category-selection view and return to the main panel.
       * @public
       */
      closeCategorySearch() {
        this.currentCategory = null;
      },
    },
    $trs: {
      keywords: {
        message: 'Keywords',
        context: 'Section header label in the Library page sidebar.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .side-panel-folder-link {
    margin-top: 12px;
    margin-bottom: 12px;

    /deep/ .link-text {
      text-decoration: none !important;
    }
  }

  .section {
    margin-top: 40px;

    &:first-child {
      margin-top: 0;
    }
  }

  .title {
    margin-bottom: 16px;
  }

  .categoryIcon {
    position: absolute;
    top: 50%;
    left: 0.5em;
    transform: translateY(-50%);
  }

  .categoryIconAfter {
    position: absolute;
    top: 50%;
    right: 0.5em;
    transform: translateY(-50%);
  }

  .categoryButton {
    // Ensure the child KIcons' absolute positioning anchors to this button
    position: relative;
    width: 100%;
    // 0.5em around except on the right where the category icon is
    padding: 0 0.5em 0 2.25em;
    font-weight: normal;
    text-align: left;
    // KButton text formatting overrides
    text-transform: unset;
  }

  .categoryButton:not(:last-child) {
    margin-bottom: 0.5em;
  }

  .linear-loader {
    right: 35px;
    bottom: 25px;
    width: 120%;
  }

</style>
