<template>

  <component
    :is="windowIsLarge ? 'section' : 'SidePanelModal'"
    alignment="left"
    role="region"
    :class="windowIsLarge ? 'side-panel' : ''"
    :closeButtonIconType="closeButtonIcon"
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
    @closePanel="currentCategory ? (currentCategory = null) : $emit('close')"
    @shouldFocusFirstEl="focusFirstEl()"
  >
    <div
      v-if="windowIsLarge || !currentCategory"
      :class="windowIsLarge ? '' : 'drawer-panel'"
    >
      <!-- search by keyword -->
      <h2 class="title">
        {{ $tr('keywords') }}
      </h2>
      <SearchBox
        key="channel-search"
        ref="searchBox"
        placeholder="findSomethingToLearn"
        :value="value.keywords || ''"
        @change="val => $emit('input', { ...value, keywords: val })"
      />
      <div v-if="Object.keys(availableLibraryCategories).length">
        <h2 class="section title">
          {{ $tr('categories') }}
        </h2>
        <!-- list of category metadata - clicking prompts a filter modal -->
        <div
          v-for="(category, key) in availableLibraryCategories"
          :key="key"
          span="4"
          class="category-list-item"
        >
          <KButton
            :text="coreString(category.value)"
            appearance="flat-button"
            :appearanceOverrides="
              isCategoryActive(category.value)
                ? { ...categoryListItemStyles, ...categoryListItemActiveStyles }
                : categoryListItemStyles
            "
            :disabled="
              availableRootCategories &&
                !availableRootCategories[category.value] &&
                !isCategoryActive(category.value)
            "
            :iconAfter="hasNestedCategories(key) ? 'chevronRight' : null"
            @click="handleCategory(key)"
          />
        </div>
        <div
          span="4"
          class="category-list-item"
        >
          <KButton
            :text="coreString('uncategorized')"
            appearance="flat-button"
            :appearanceOverrides="
              isCategoryActive('no_categories')
                ? { ...categoryListItemStyles, ...categoryListItemActiveStyles }
                : categoryListItemStyles
            "
            @click="noCategories"
          />
        </div>
      </div>
      <ActivityButtonsGroup
        class="section"
        @input="handleActivity"
      />
      <!-- Filter results by learning activity, displaying all options -->
      <SelectGroup
        v-model="inputValue"
        :showChannels="showChannels"
        class="section"
      />
      <div
        v-if="Object.keys(availableResourcesNeeded).length"
        class="section"
      >
        <h2 class="title">
          {{ coreString('showResources') }}
        </h2>
        <div
          v-for="(val, activity) in availableResourcesNeeded"
          :key="activity"
          span="4"
          alignment="center"
        >
          <KCheckbox
            :checked="value.learner_needs[val]"
            :label="coreString(activity)"
            :disabled="availableNeeds && !availableNeeds[val]"
            @change="handleNeed(val)"
          />
        </div>
      </div>
    </div>
    <CategorySearchModal
      v-if="currentCategory"
      ref="searchModal"
      :class="windowIsLarge ? '' : 'drawer-panel'"
      :selectedCategory="currentCategory"
      @cancel="currentCategory = null"
      @input="selectCategory"
    />
  </component>

</template>


<script>

  //
  // Usage of injectBaseSearch() in this component requires ancestor's use of useSearch
  // Examples of it can be found in the following components:
  // - kolibri/plugins/learn/assets/src/views/LibraryPage/index.vue
  //   in https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/learn/assets/src/views/LibraryPage/index.vue#L238-L251
  // - kolibri/plugins/learn/assets/src/views/TopicsPage/index.vue
  //   in https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/learn/assets/src/views/TopicsPage/index.vue#L366-L378
  //

  import { NoCategories } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { ref } from 'kolibri.lib.vueCompositionApi';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import SearchBox from '../SearchBox';
  import SidePanelModal from '../SidePanelModal';
  import ActivityButtonsGroup from './ActivityButtonsGroup';
  import CategorySearchModal from './CategorySearchModal';
  import SelectGroup from './SelectGroup';

  export default {
    name: 'SearchFiltersPanel',
    components: {
      SearchBox,
      ActivityButtonsGroup,
      SelectGroup,
      CategorySearchModal,
      SidePanelModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge } = useKResponsiveWindow();
      const {
        availableLibraryCategories,
        availableResourcesNeeded,
        searchableLabels,
        activeSearchTerms,
      } = injectBaseSearch();
      const currentCategory = ref(null);
      const { filterAndSearchLabel$ } = searchAndFilterStrings;
      return {
        filterAndSearchLabel$,
        availableLibraryCategories,
        availableResourcesNeeded,
        currentCategory,
        searchableLabels,
        activeSearchTerms,
        windowIsLarge,
      };
    },
    props: {
      value: {
        type: Object,
        required: true,
        validator(value) {
          const inputKeys = [
            'learning_activities',
            'learner_needs',
            'channels',
            'accessibility_labels',
            'languages',
            'grade_levels',
          ];
          return inputKeys.every(k => Object.prototype.hasOwnProperty.call(value, k));
        },
      },
      width: {
        type: [Number, String],
        required: false,
        default: null,
      },
      showChannels: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      closeButtonIcon() {
        return this.currentCategory ? 'back' : 'close';
      },
      inputValue: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      categoryListItemStyles() {
        return {
          color: this.$themeTokens.text,
          width: '100%',
          border: '2px solid transparent',
          textAlign: this.isRtl ? 'right' : 'left',
          fontWeight: 'normal',
          textTransform: 'none',
          position: 'relative',
          transition: 'none',
          ':hover': this.categoryListItemActiveStyles,
        };
      },
      categoryListItemActiveStyles() {
        return {
          backgroundColor: this.$themeBrand.primary.v_200,
          border: '2px',
          borderColor: this.$themeTokens.primary,
          borderStyle: 'solid',
          borderRadius: '4px',
        };
      },
      availableRootCategories() {
        if (this.searchableLabels) {
          const roots = {};
          for (const key of this.searchableLabels.categories) {
            const root = key.split('.')[0];
            roots[root] = true;
          }
          return roots;
        }
        return null;
      },
      availableNeeds() {
        if (this.searchableLabels) {
          const needs = {};
          for (const key of this.searchableLabels.learner_needs) {
            const root = key.split('.')[0];
            needs[root] = true;
            needs[key] = true;
          }
          return needs;
        }
        return null;
      },
      activeCategories() {
        return Object.keys((this.activeSearchTerms && this.activeSearchTerms.categories) || {});
      },
    },
    methods: {
      isCategoryActive(categoryValue) {
        // Takes the dot separated category value and checks if it is active
        return this.activeCategories.some(k => k.includes(categoryValue));
      },
      noCategories() {
        this.$emit('input', { ...this.value, categories: { [NoCategories]: true } });
      },
      hasNestedCategories(category) {
        return Object.keys(this.availableLibraryCategories[category].nested).length > 0;
      },
      handleActivity(activity) {
        if (activity && !this.value.learning_activities[activity]) {
          const learning_activities = {
            [activity]: true,
            ...this.value.learning_activities,
          };
          this.$emit('input', { ...this.value, learning_activities });
        } else if (activity && this.value.learning_activities[activity]) {
          const learning_activities = { ...this.value.learning_activities };
          delete learning_activities[activity];
          this.$emit('input', { ...this.value, learning_activities });
        }
      },
      handleNeed(need) {
        if (this.value.learner_needs[need]) {
          const learner_needs = {};
          for (const n in this.value.learner_needs) {
            if (n !== need) {
              learner_needs[n] = true;
            }
          }
          this.$emit('input', { ...this.value, learner_needs });
        } else {
          this.$emit('input', {
            ...this.value,
            learner_needs: { ...this.value.learner_needs, [need]: true },
          });
        }
      },
      setCategory(category) {
        if (this.value.categories[category]) {
          const categories = { ...this.value.categories };
          delete categories[category];
          this.$emit('input', { ...this.value, categories });
        } else {
          const categories = { [category]: true };
          for (const c in this.value.categories) {
            // Filter out any subcategories of the selected category
            if (!c.startsWith(category)) {
              categories[c] = true;
            }
          }
          this.$emit('input', { ...this.value, categories });
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
       * @public
       * Focuses on correct first element for FocusTrap depending on content
       * rendered in SearchFiltersPanel.
       */
      focusFirstEl() {
        if (this.$refs.searchBox) {
          this.$refs.searchBox.focusSearchBox();
        }
      },
    },
    $trs: {
      keywords: {
        message: 'Keywords',
        context: 'Section header label in the Library page sidebar.',
      },
      categories: {
        message: 'Categories',
        context: 'Section header label in the Library page sidebar.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .drawer-panel {
    padding-bottom: 60px;
  }

  .side-panel {
    position: fixed;
    top: 60px;
    left: 0;
    height: 100%;
    padding: 24px 24px 0;
    overflow-y: scroll;
    font-size: 14px;
    box-shadow: 0 3px 3px 0 #00000040;
  }

  /*
  * Work around for https://bugzilla.mozilla.org/show_bug.cgi?id=1417667
  */
  .side-panel::after {
    display: block;
    padding-bottom: 70px;
    content: '';
  }

  .side-panel-folder-link {
    margin-top: 12px;
    margin-bottom: 12px;

    /deep/ .link-text {
      text-decoration: none !important;
    }
  }

  .section {
    margin-top: 40px;
  }

  .card-grid {
    margin-top: 40px;
    margin-left: 20px;
  }

  /deep/ .prop-icon {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .title {
    margin-bottom: 16px;
  }

</style>
