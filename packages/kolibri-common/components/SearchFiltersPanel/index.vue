<template>

  <section
    role="region"
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
      <div v-if="!accordion">
        <!-- search by keyword -->
        <h2 class="title">
          {{ $tr('keywords') }}
        </h2>
        <SearchBox
          key="channel-search"
          ref="searchBox"
          :placeholder="coreString('findSomethingToLearn')"
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
          v-if="showActivities"
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

        <div v-if="accordion && !currentCategory">
          <!-- search by keyword -->
          <h2 class="title">
            {{ $tr('keywords') }}
          </h2>
          <SearchBox
            key="channel-search"
            ref="searchBox"
            style="margin-bottom: 1em"
            :placeholder="$tr('searchByKeyword')"
            :value="value.keywords || ''"
            @change="val => $emit('input', { ...value, keywords: val })"
          />

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
      </div>
    </div>
    <!-- When accordion mode is NOT activated, show as KModal, otherwise, just a div -->
    <component
      :is="accordion ? 'div' : 'KModal'"
      v-if="windowIsLarge && currentCategory"
      appendToOverlay
      :title="$tr('chooseACategory')"
      :cancelText="coreString('closeAction')"
      size="large"
      @cancel="currentCategory = null"
    >
      <CategorySearchModal
        v-if="currentCategory"
        ref="searchModal"
        :class="windowIsLarge ? '' : 'drawer-panel'"
        :selectedCategory="currentCategory"
        @input="selectCategory"
      />
    </component>
  </section>

</template>


<script>

  //
  // Usage of injectBaseSearch() in this component requires ancestor's use of useBaseSearch
  // Examples of it can be found in the following components
  // (Note: useSearch extends useBaseSearch):
  // - kolibri/plugins/learn/assets/src/views/LibraryPage/index.vue
  //   in https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/learn/assets/src/views/LibraryPage/index.vue#L238-L251
  // - kolibri/plugins/learn/assets/src/views/TopicsPage/index.vue
  //   in https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/learn/assets/src/views/TopicsPage/index.vue#L366-L378
  //

  import { NoCategories } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { ref } from 'vue';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import SearchBox from '../SearchBox';
  import ActivityButtonsGroup from './ActivityButtonsGroup';
  import CategorySearchModal from './CategorySearchModal';
  import SelectGroup from './SelectGroup';
  import AccordionSelectGroup from './AccordionSelectGroup';

  export default {
    name: 'SearchFiltersPanel',
    components: {
      SearchBox,
      ActivityButtonsGroup,
      SelectGroup,
      CategorySearchModal,
      AccordionSelectGroup,
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
      /**
       * When true, options are presented using accordions rather than buttons & dropdowns
       */
      accordion: {
        type: Boolean,
        default: false,
      },
      value: {
        type: Object,
        required: true,
        validator(value) {
          const inputKeys = [
            'learning_activities',
            'learner_needs',
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
      showActivities: {
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
          backgroundColor: this.$themeBrand.primary.v_100,
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
      searchByKeyword: {
        message: 'Search by keyword',
        context: 'Placeholder text in the search box, which is otherwise not labelled',
      },
      categories: {
        message: 'Categories',
        context: 'Section header label in the Library page sidebar.',
      },
      chooseACategory: {
        message: 'Choose a category',
        context: 'Title of the category selection window',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .drawer-panel {
    padding-bottom: 60px;
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

</style>
