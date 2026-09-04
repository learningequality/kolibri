<template>

  <div class="filter-pills">
    <fieldset class="filters-fieldset">
      <legend class="visuallyhidden">{{ appliedFiltersGroupLabel$() }}</legend>
      <label
        v-for="(entry, index) in entries"
        :key="`${entry.type}-${index}`"
        :data-testid="`${entry.type}-pill`"
        class="pill"
        :class="$computedClass(pillPseudoStylesFor())"
        :style="pillColorStyleFor(entry)"
      >
        <input
          type="checkbox"
          class="visuallyhidden"
          :checked="isFilterActive(entry.termKey, entry.value)"
          :disabled="loading"
          @click="toggleFilter({ key: entry.termKey, value: entry.value })"
        >
        <KIcon
          v-if="entry.icon"
          :icon="entry.icon"
          :color="entry.type === 'activity' ? null : $themeTokens.primary"
          class="pill-icon"
        />
        <span class="link-text">{{ entry.label }}</span>
        <KIcon
          v-if="iconAfterFor(entry)"
          :icon="iconAfterFor(entry)"
          class="pill-icon-after"
        />
      </label>
    </fieldset>
    <span
      v-if="hasAvailableLabels"
      class="all-filters-group"
    >
      <span
        class="pill-divider"
        :style="{ backgroundColor: $themePalette.grey.v_300 }"
      ></span>
      <KButton
        data-testid="all-filters-pill"
        :text="allFilters$()"
        appearance="flat-button"
        class="pill"
        :appearanceOverrides="pillColorStyleFor({})"
        :disabled="loading"
        @click="$emit('openFilters')"
      >
        <template #icon>
          <KIcon
            icon="filter"
            class="pill-icon"
          />
        </template>
        <template #iconAfter>
          <KIcon
            :icon="isRtl ? 'chevronLeft' : 'chevronRight'"
            class="pill-icon-after"
          />
        </template>
      </KButton>
    </span>
    <KButton
      v-if="hasActiveFilters"
      data-testid="clear-all"
      :text="clearAllAction$()"
      appearance="flat-button"
      icon="close"
      class="clear-all"
      :disabled="loading"
      @click="clearSearch"
    />
  </div>

</template>


<script>

  import { computed, getCurrentInstance } from 'vue';
  import { get } from '@vueuse/core';
  import { themeTokens, themeBrand, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { CategoriesLookup } from 'kolibri/constants';
  import { coreString, coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { injectBaseSearch, searchKeys } from 'kolibri-common/composables/useBaseSearch';
  import { getCategoryIcon } from 'kolibri-common/utils/categoryIcon';
  import { getLearningActivityIcon } from 'kolibri-common/utils/learningActivityIcon';

  export default {
    name: 'HorizontalFilterPills',
    setup() {
      const instance = getCurrentInstance().proxy;
      const {
        availableLearningActivities,
        availableLibraryCategories,
        availableLanguages,
        appliedFilters,
        isFilterActive,
        isLabelAvailable,
        toggleFilter,
        clearSearch,
        searchLoading,
        searchableLabels,
        hasGlobalLabels,
      } = injectBaseSearch();

      const hasActiveFilters = computed(() => appliedFilters().length > 0);

      // The panel only offers labels that could still yield results, so it would open
      // with nothing selectable if the catalog is unavailable, or if the current search
      // has narrowed every one of them away.
      const hasAvailableLabels = computed(() => {
        if (!get(hasGlobalLabels)) {
          return false;
        }
        const scoped = get(searchableLabels);
        if (!scoped) {
          return true;
        }
        return searchKeys.some(key => (scoped[key] || []).length);
      });

      // Resolve a value stored in `searchTerms` back to its catalog key
      const activityKeyByValue = computed(() =>
        Object.fromEntries(
          Object.entries(get(availableLearningActivities) || {}).map(([k, v]) => [v, k]),
        ),
      );

      // Decorate a {termKey, value} pair with the label and icon for its pill
      function entryFor(termKey, value) {
        if (termKey === 'keywords') {
          return { type: 'keyword', termKey, value, label: value, icon: null };
        }
        if (termKey === 'learning_activities') {
          const key = get(activityKeyByValue)[value];
          return {
            type: 'activity',
            termKey,
            value,
            label: key ? coreString(key) : value,
            icon: key ? getLearningActivityIcon(key) : null,
          };
        }
        if (termKey === 'categories') {
          // CategoriesLookup is the flat value→key map for every category at any
          // depth, so this resolves nested subcategory values too.
          const key = CategoriesLookup[value];
          return {
            type: 'category',
            termKey,
            value,
            label: key ? coreString(key) : value,
            icon: key ? getCategoryIcon(key) : null,
          };
        }
        if (termKey === 'languages') {
          // Language values are codes (e.g. 'en'), which aren't in coreString's
          // metadata lookup — resolve the human-readable name from the catalog.
          const lang = (get(availableLanguages) || []).find(l => l.id === value);
          return {
            type: 'language',
            termKey,
            value,
            label: lang ? lang.lang_name : value,
            icon: null,
          };
        }
        return { type: termKey, termKey, value, label: coreString(value), icon: null };
      }

      // Applied filters first, then still-yieldable catalog refinements,
      // deduped so an active catalog item doesn't render twice
      const entries = computed(() => {
        const out = new Map();
        const add = entry => {
          const id = `${entry.termKey}:${entry.value}`;
          if (!out.has(id)) {
            out.set(id, entry);
          }
        };
        appliedFilters().forEach(({ key, value }) => add(entryFor(key, value)));
        Object.values(get(availableLearningActivities) || {})
          .filter(value => isLabelAvailable('learning_activities', value))
          .forEach(value => add(entryFor('learning_activities', value)));
        Object.values(get(availableLibraryCategories) || {})
          .filter(info => isLabelAvailable('categories', info.value))
          .forEach(info => add(entryFor('categories', info.value)));
        return [...out.values()];
      });

      function iconAfterFor(entry) {
        // Trailing icon removes the filter; shown only when active.
        return isFilterActive(entry.termKey, entry.value) ? 'close' : null;
      }

      function pillColorStyleFor(entry) {
        if (isFilterActive(entry.termKey, entry.value)) {
          return {
            backgroundColor: themeBrand().primary.v_100,
            border: `1px solid ${themeTokens().primary}`,
            // primaryDark for WCAG AA contrast on the v_100 background
            color: themeTokens().primaryDark,
            fontWeight: 'bold',
          };
        }
        return {
          backgroundColor: themeTokens().surface,
          border: `1px solid ${themePalette().grey.v_300}`,
          color: themeTokens().text,
          fontWeight: 'normal',
        };
      }

      // for a11y, the pill is a semantic checkbox and label
      // but visually styled to match KButton for sighted users
      function pillPseudoStylesFor() {
        return {
          ':hover': get(searchLoading) ? {} : { backgroundColor: 'rgba(0,0,0,.1)' },
          ':focus-within': { ...instance.$coreOutline, outlineOffset: 0 },
          ...(get(searchLoading)
            ? { pointerEvents: 'none', cursor: 'default', opacity: 0.5 }
            : { cursor: 'pointer' }),
        };
      }

      const { allFilters$, appliedFiltersGroupLabel$ } = searchAndFilterStrings;
      const { clearAllAction$ } = coreStrings;

      return {
        entries,
        hasActiveFilters,
        hasAvailableLabels,
        isFilterActive,
        iconAfterFor,
        pillColorStyleFor,
        pillPseudoStylesFor,
        toggleFilter,
        clearSearch,
        loading: searchLoading,
        allFilters$,
        appliedFiltersGroupLabel$,
        clearAllAction$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  // Strip the fieldset's default border/padding/min-width and let its pills
  // lay out as direct flex children of .filter-pills, same as before grouping.
  .filters-fieldset {
    all: unset;
    display: contents;
  }

  .filter-pills .pill {
    display: inline-flex;
    align-items: center;
    height: auto;
    min-height: 0;
    padding: 8px;
    font-size: 16px;
    line-height: 1;
    text-transform: none;
    white-space: nowrap;
    border-radius: 24px;
  }

  // Keep the divider attached to the All filters pill when the row wraps
  .all-filters-group {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .pill-divider {
    align-self: center;
    width: 1px;
    height: 24px;
  }

  .clear-all {
    align-self: center;
    text-transform: none;
  }

  // KButton's icon/text spacing lives in its `textStyle`, which only fires for
  // the icon props — not the slots we use here — so add the gap ourselves.
  // `.icon-container` (the leading-icon wrapper) also carries `top: 4px` to
  // centre icons in the default 36px button; our slim pill needs it pulled back.
  .pill-icon {
    top: -2px;
    margin-right: 8px;
  }

  .pill-icon-after {
    margin-left: 8px;
  }

</style>
