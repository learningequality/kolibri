<template>

  <div
    v-if="show"
    :id="listboxId"
    data-testid="autocomplete-dropdown"
    class="autocomplete-dropdown"
    role="listbox"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <!-- Focus state: no query - show history and recent searches -->
    <template v-if="!query">
      <div
        v-if="historyItems.length"
        data-testid="history-section"
        class="section"
        role="group"
        :aria-label="searchHistory$()"
      >
        <h3
          class="section-header"
          :style="{ color: $themePalette.grey.v_600 }"
          aria-hidden="true"
        >
          {{ searchHistory$() }}
        </h3>
        <!-- Combobox aria-activedescendant pattern: keyboard activation is on the
             input (LibrarySearchBar), so options are non-focusable and need no key
             handler of their own. tabindex="-1" makes them programmatic focus targets. -->
        <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events -->
        <div
          v-for="(item, idx) in historyItems"
          :id="optionId(idx)"
          :key="item.id"
          data-testid="history-item"
          class="dropdown-item"
          :class="$computedClass(hoverStyle)"
          :style="activeStyle(idx)"
          role="option"
          tabindex="-1"
          :aria-selected="ariaSelected(idx)"
          @click="$emit('selectContent', item)"
        >
          <LearningActivityIcon
            v-if="item.learning_activities && item.learning_activities.length"
            :kind="item.learning_activities"
            :shaded="true"
            class="item-icon"
            :style="{ fill: $themeTokens.primary }"
          />
          <KIcon
            v-else
            icon="interactShaded"
            class="item-icon"
            :style="{ fill: $themeTokens.primary }"
          />
          <div class="item-content">
            <span class="item-title">{{ item.title }}</span>
            <span
              v-if="item.channel_title"
              class="item-channel"
              :style="{ color: $themePalette.grey.v_500 }"
            >
              {{ item.channel_title }}
            </span>
          </div>
          <div
            v-if="item.learning_activities && item.learning_activities.length"
            class="item-tags"
          >
            <span
              v-for="activity in item.learning_activities"
              :key="activity"
              data-testid="metadata-tag"
              class="metadata-tag"
              :style="{
                backgroundColor: $themeBrand.primary.v_100,
                color: $themeTokens.primary,
              }"
            >
              {{ coreString(activity) }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="recentSearches.length"
        data-testid="recent-searches-section"
        class="section"
        role="group"
        :aria-label="recentSearches$()"
      >
        <h3
          class="section-header"
          :style="{ color: $themePalette.grey.v_600 }"
          aria-hidden="true"
        >
          {{ recentSearches$() }}
        </h3>
        <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events -->
        <div
          v-for="(term, idx) in recentSearches"
          :id="optionId(historyItems.length + idx)"
          :key="'search-' + idx"
          data-testid="recent-search-item"
          class="dropdown-item"
          :class="$computedClass(hoverStyle)"
          :style="activeStyle(historyItems.length + idx)"
          role="option"
          tabindex="-1"
          :aria-selected="ariaSelected(historyItems.length + idx)"
          @click="$emit('selectSearch', term)"
        >
          <KIcon
            icon="search"
            class="item-icon"
            :style="{ fill: $themePalette.grey.v_500 }"
          />
          <div class="item-content">
            <span class="item-title">{{ term }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Typing state: show autocomplete suggestions -->
    <template v-else>
      <!-- Metadata filter suggestions: one pill per row, the combined "apply all"
           option first (see filterSuggestions ordering in useBaseSearch) -->
      <!-- eslint-disable vuejs-accessibility/click-events-have-key-events -->
      <!-- eslint-disable vuejs-accessibility/mouse-events-have-key-events -->
      <div
        v-for="(item, idx) in filterSuggestions"
        :id="optionId(idx)"
        :key="'filter-' + idx"
        :data-testid="
          item.type === 'combination' ? 'combination-suggestion' : 'filter-suggestion-pill'
        "
        class="dropdown-item"
        :class="$computedClass(hoverStyle)"
        :style="activeStyle(idx)"
        role="option"
        tabindex="-1"
        :aria-selected="ariaSelected(idx)"
        @click="handleSuggestionClick(item)"
        @mouseenter="$emit('hoverFilter', item)"
        @mouseleave="$emit('hoverFilter', null)"
      >
        <span
          class="filter-pill"
          :style="{
            backgroundColor: $themeBrand.primary.v_100,
            border: `1px solid ${$themeTokens.primary}`,
            color: $themeTokens.primary,
          }"
        >
          <!-- Combined: each matched filter's icon + label, separated -->
          <template v-if="item.type === 'combination'">
            <template v-for="(f, fIdx) in item.filters">
              <LearningActivityIcon
                v-if="getActivityKind(f)"
                :key="'ci-' + fIdx"
                :kind="getActivityKind(f)"
                :shaded="true"
                class="pill-icon"
                :style="{ fill: $themeTokens.primary }"
              />
              <KIcon
                v-else-if="f.type === 'category' && f.key"
                :key="'ci-' + fIdx"
                :icon="getCategoryIcon(f.key)"
                class="pill-icon"
                :style="{ fill: $themeTokens.primary }"
              />
              <KIcon
                v-else
                :key="'ci-' + fIdx"
                icon="filterList"
                class="pill-icon"
                :style="{ fill: $themeTokens.primary }"
              />
              <span
                :key="'cl-' + fIdx"
                class="pill-label"
              >{{ f.label }}</span>
              <span
                v-if="fIdx < item.filters.length - 1"
                :key="'cs-' + fIdx"
                class="pill-separator"
                aria-hidden="true"
              >·</span>
            </template>
          </template>
          <template v-else>
            <LearningActivityIcon
              v-if="getActivityKind(item)"
              :kind="getActivityKind(item)"
              :shaded="true"
              class="pill-icon"
              :style="{ fill: $themeTokens.primary }"
            />
            <KIcon
              v-else-if="item.type === 'category' && item.key"
              :icon="getCategoryIcon(item.key)"
              class="pill-icon"
              :style="{ fill: $themeTokens.primary }"
            />
            <KIcon
              v-else
              icon="filterList"
              class="pill-icon"
              :style="{ fill: $themeTokens.primary }"
            />
            <span class="pill-label">{{ item.label }}</span>
          </template>
        </span>
      </div>
      <!-- eslint-enable vuejs-accessibility/click-events-have-key-events -->
      <!-- eslint-enable vuejs-accessibility/mouse-events-have-key-events -->

      <!-- Content suggestions as regular list items -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events -->
      <div
        v-for="(item, idx) in contentSuggestions"
        :id="optionId(filterSuggestions.length + idx)"
        :key="'content-' + idx"
        data-testid="suggestion-item"
        class="dropdown-item"
        :class="$computedClass(hoverStyle)"
        :style="activeStyle(filterSuggestions.length + idx)"
        role="option"
        tabindex="-1"
        :aria-selected="ariaSelected(filterSuggestions.length + idx)"
        @click="handleSuggestionClick(item)"
      >
        <LearningActivityIcon
          v-if="item.learning_activities && item.learning_activities.length"
          :kind="item.learning_activities"
          :shaded="true"
          class="item-icon"
          :style="{ fill: $themeTokens.primary }"
        />
        <KIcon
          v-else
          icon="interactShaded"
          class="item-icon"
          :style="{ fill: $themeTokens.primary }"
        />
        <div class="item-content">
          <span class="item-title">{{ item.title }}</span>
          <span
            v-if="item.channel_title"
            class="item-channel"
            :style="{ color: $themePalette.grey.v_500 }"
          >
            {{ item.channel_title }}
          </span>
        </div>
        <div
          v-if="item.learning_activities && item.learning_activities.length"
          class="item-tags"
        >
          <span
            v-for="activity in item.learning_activities"
            :key="activity"
            data-testid="metadata-tag"
            class="metadata-tag"
            :style="{
              backgroundColor: $themeBrand.primary.v_100,
              color: $themeTokens.primary,
            }"
          >
            {{ coreString(activity) }}
          </span>
        </div>
      </div>
    </template>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { LearningActivities } from 'kolibri/constants';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import { getCategoryIcon } from 'kolibri-common/utils/categoryIcon';

  export default {
    name: 'SearchAutocompleteDropdown',
    components: {
      LearningActivityIcon,
    },
    setup(props, { emit }) {
      const filterSuggestions = computed(() => props.suggestions.filter(s => s.type !== 'content'));
      const contentSuggestions = computed(() =>
        props.suggestions.filter(s => s.type === 'content'),
      );

      // Each navigable row gets a stable id so the input's aria-activedescendant
      // can point at the keyboard-focused option. The index is the row's
      // position in the parent's flat navigable list (see LibrarySearchBar).
      function optionId(index) {
        return `${props.listboxId}-option-${index}`;
      }
      function isActive(index) {
        return props.activeIndex === index;
      }
      // Vue 2 drops attributes bound to a boolean false, so render the
      // aria-selected state as an explicit string.
      function ariaSelected(index) {
        return isActive(index) ? 'true' : 'false';
      }
      // Hover and keyboard-active rows share one theme-aware tint instead of a
      // hard-coded overlay colour.
      const hoverTint = computed(() => themePalette().grey.v_100);
      const hoverStyle = computed(() => ({ ':hover': { backgroundColor: hoverTint.value } }));
      function activeStyle(index) {
        return isActive(index) ? { backgroundColor: hoverTint.value } : null;
      }

      // Learning activity kind for LearningActivityIcon, or null if the item
      // isn't an activity suggestion
      function getActivityKind(item) {
        if (item.type === 'activity' && item.key) {
          return LearningActivities[item.key];
        }
        return null;
      }

      function handleSuggestionClick(item) {
        if (item.type === 'content') {
          emit('selectContent', item);
        } else if (item.type === 'combination') {
          emit('selectCombination', item);
        } else {
          emit('selectFilter', item);
        }
      }

      const { searchHistory$, recentSearches$ } = searchAndFilterStrings;

      return {
        filterSuggestions,
        contentSuggestions,
        getActivityKind,
        handleSuggestionClick,
        getCategoryIcon,
        coreString,
        optionId,
        ariaSelected,
        hoverStyle,
        activeStyle,
        searchHistory$,
        recentSearches$,
      };
    },
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      query: {
        type: String,
        default: '',
      },
      suggestions: {
        type: Array,
        default: () => [],
      },
      historyItems: {
        type: Array,
        default: () => [],
      },
      recentSearches: {
        type: Array,
        default: () => [],
      },
      // Index of the keyboard-focused row in the flat navigable list, or -1.
      activeIndex: {
        type: Number,
        default: -1,
      },
      // id of the listbox, used to build per-option ids for aria-activedescendant.
      listboxId: {
        type: String,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .autocomplete-dropdown {
    position: absolute;
    right: 0;
    left: 0;
    z-index: 8;
    max-height: 400px;
    overflow-y: auto;
    border-radius: 0 0 8px 8px;
    // Deliberate deviation from the elevation tokens: this matches the search
    // bar's own dropshadow so the dropdown reads as an extension of it. Shadows
    // are neutral and don't carry brand colour, so a fixed value is acceptable.
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .section {
    padding: 8px 0;
  }

  .section-header {
    padding: 4px 16px;
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;
  }

  .item-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-inline-end: 12px;
  }

  .item-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .item-title {
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-channel {
    font-size: 12px;
  }

  .item-tags {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    margin-inline-start: 8px;
  }

  .metadata-tag {
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 10px;
  }

  .filter-pill {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 5px 10px;
    font-size: 13px;
    font-weight: normal;
    line-height: 1;
    cursor: pointer;
    border-radius: 20px;
  }

  .pill-label {
    white-space: nowrap;
  }

  .pill-separator {
    opacity: 0.5;
  }

  // KIcon's SVG uses position: relative; top: 0.125em for inline text flow;
  // undo it inside the flex pill so the icon sits at true centre.
  .filter-pill .pill-icon {
    top: 0;
  }

</style>
