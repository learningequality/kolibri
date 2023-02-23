<template>

  <section
    role="region"
    :aria-label="learnString('filterAndSearchLabel')"
    :style="{
      color: $themeTokens.text,
      backgroundColor: $themeTokens.surface,
      width: width,
    }"
    :class="position === 'embedded' ? 'side-panel' : ''"
  >
    <div v-if="topics && topics.length && topicsListDisplayed">
      <div v-for="t in topics" :key="t.id">
        <KRouterLink
          ref="folders"
          :text="t.title"
          class="side-panel-folder-link"
          :appearanceOverrides="{ color: $themeTokens.text }"
          :to="genContentLinkBackLinkCurrentPage(t.id, false)"
        />
      </div>
      <KButton
        v-if="more && !topicsLoading"
        appearance="basic-link"
        @click="$emit('loadMoreTopics')"
      >
        {{ coreString('viewMoreAction') }}
      </KButton>
      <KCircularLoader v-if="topicsLoading" />
    </div>
    <div v-else>
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
            :appearanceOverrides="isKeyActive(key)
              ? { ...categoryListItemStyles, ...categoryListItemActiveStyles }
              : categoryListItemStyles"
            :disabled="availableRootCategories &&
              !availableRootCategories[key] &&
              !isKeyActive(key)"
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
            :appearanceOverrides="isKeyActive('no_categories')
              ? { ...categoryListItemStyles, ...categoryListItemActiveStyles }
              : categoryListItemStyles"
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
  </section>

</template>


<script>

  import { NoCategories } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import SearchBox from '../SearchBox';
  import commonLearnStrings from '../commonLearnStrings';
  import useContentLink from '../../composables/useContentLink';
  import { injectSearch } from '../../composables/useSearch';
  import ActivityButtonsGroup from './ActivityButtonsGroup';
  import SelectGroup from './SelectGroup';

  export default {
    name: 'SearchFiltersPanel',
    components: {
      SearchBox,
      ActivityButtonsGroup,
      SelectGroup,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const {
        availableLibraryCategories,
        availableResourcesNeeded,
        searchableLabels,
        activeSearchTerms,
      } = injectSearch();
      return {
        availableLibraryCategories,
        availableResourcesNeeded,
        genContentLinkBackLinkCurrentPage,
        searchableLabels,
        activeSearchTerms,
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
      topics: {
        type: Array,
        default() {
          return [];
        },
      },
      more: {
        type: Object,
        default: null,
      },
      topicsLoading: {
        type: Boolean,
        default: false,
      },
      width: {
        type: [Number, String],
        required: true,
      },
      topicsListDisplayed: {
        type: Boolean,
        required: false,
      },
      position: {
        type: String,
        required: true,
        validator(val) {
          return ['embedded', 'overlay'].includes(val);
        },
      },
      showChannels: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
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
          backgroundColor: this.$themeBrand.primary.v_50,
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
      activeKeys() {
        return Object.keys((this.activeSearchTerms && this.activeSearchTerms.categories) || {});
      },
    },
    methods: {
      isKeyActive(key) {
        return !!this.activeKeys.filter(k => k.includes(key)).length;
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
      handleCategory(category) {
        // for categories with sub-categories, open the modal
        if (
          this.availableLibraryCategories[category] &&
          this.availableLibraryCategories[category].nested &&
          Object.keys(this.availableLibraryCategories[category].nested).length > 0
        ) {
          this.$emit('currentCategory', category);
        }
        // for valid categories with no subcategories, search directly
        else if (this.availableLibraryCategories[category]) {
          this.$emit('input', {
            ...this.value,
            // This parallels the behaviour of setCategory in the useSearch
            // composable - where category selection is mutually exclusive.
            categories: { [this.availableLibraryCategories[category].value]: true },
          });
        }
      },
      /**
       * @public
       * Focuses on correct first element for FocusTrap depending on content
       * rendered in SearchFiltersPanel.
       */
      focusFirstEl() {
        if (this.$refs.searchBox) {
          this.$refs.searchBox.focusSearchBox();
        } else if (this.$refs.folders && this.$refs.folders.length > 0) {
          this.$refs.folders[0].$el.focus();
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

  .side-panel {
    position: fixed;
    top: 60px;
    left: 0;
    height: 100%;
    padding: 24px;
    overflow-y: scroll;
    font-size: 14px;
    box-shadow: 0 3px 3px 0 #00000040;
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
