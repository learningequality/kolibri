<template>

  <form
    class="library-search-bar"
    @submit.prevent="handleSubmit"
  >
    <div
      class="search-row"
      :style="{
        backgroundColor: $themeTokens.surface,
        borderColor: $themePalette.grey.v_300,
      }"
    >
      <label
        class="visuallyhidden"
        :for="inputId"
      >{{ searchLabel$() }}</label>
      <input
        :id="inputId"
        ref="searchInput"
        :value="keywordsInput"
        type="search"
        :class="['search-input', $computedClass(placeholderStyle)]"
        :style="{ color: $themeTokens.text }"
        dir="auto"
        :placeholder="placeholder || findSomethingToLearn$()"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="showDropdown ? 'true' : 'false'"
        :aria-controls="dropdownId"
        :aria-activedescendant="activeOptionId"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @blur="handleBlur"
      >
      <div
        v-if="highlightSegments"
        class="search-input-overlay"
        aria-hidden="true"
      >
        <span
          v-for="(seg, idx) in highlightSegments"
          :key="idx"
          :class="{ 'highlight-matched': seg.matched }"
          :style="
            seg.matched
              ? {
                backgroundColor: $themeBrand.primary.v_100,
              }
              : {}
          "
        >{{ seg.text }}</span>
      </div>
      <div class="search-actions">
        <KIconButton
          v-if="keywordsInput"
          icon="clear"
          :color="$themeTokens.text"
          size="small"
          data-testid="search-clear-button"
          :ariaLabel="clearAction$()"
          @click="handleClear"
        />
        <KButton
          data-testid="search-submit-button"
          :primary="true"
          type="submit"
          class="search-submit-button"
          :appearanceOverrides="{}"
          :disabled="!keywordsInput"
          :aria-label="startSearchButtonLabel$()"
        >
          <template #icon>
            <KIcon
              icon="search"
              :style="{ width: '24px', height: '24px' }"
              :color="$themeTokens.textInverted"
            />
          </template>
        </KButton>
      </div>
    </div>

    <SearchAutocompleteDropdown
      :show="showDropdown"
      :listboxId="dropdownId"
      :activeIndex="activeIndex"
      :query="keywordsInput"
      :suggestions="currentSuggestions"
      :historyItems="historyItems"
      :recentSearches="recentSearchTerms"
      @selectContent="handleSelectContent"
      @selectSearch="handleSelectSearch"
      @selectFilter="handleSelectFilter"
      @selectCombination="handleSelectCombination"
      @hoverFilter="handleHoverFilter"
    />
  </form>

</template>


<script>

  import { computed, onUnmounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import { get, set } from '@vueuse/core';
  import uniqueId from 'lodash/uniqueId';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import useUser from 'kolibri/composables/useUser';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import useRecentSearches from 'kolibri-common/composables/useRecentSearches';
  import useLearnerResources from '../../composables/useLearnerResources';
  import useContentLink from '../../composables/useContentLink';
  import SearchAutocompleteDropdown from './SearchAutocompleteDropdown';

  export default {
    name: 'LibrarySearchBar',
    components: {
      SearchAutocompleteDropdown,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const { currentUserId } = useUser();
      const {
        keyWordAutoCompleteHandler,
        autoCompleteSuggestions,
        getMatchedWordSegments,
        keywordsInput,
        setKeywords,
        clearKeywords,
        selectFilterSuggestion,
        selectFilterCombination,
      } = injectBaseSearch();
      const { recentSearches, addSearch } = useRecentSearches(currentUserId);
      const { resumableContentNodes } = useLearnerResources();
      const { sendPoliteMessage } = useKLiveRegion();
      const { searchLabel$, findSomethingToLearn$, clearAction$, startSearchButtonLabel$ } =
        coreStrings;
      const { autocompleteResultsAvailable$ } = searchAndFilterStrings;

      const isFocused = ref(false);
      const hoveredFilter = ref(null);
      const searchInput = ref(null);
      const inputId = uniqueId('library-search-input-');
      const dropdownId = uniqueId('library-search-listbox-');
      // Index of the keyboard-focused row in `navigableItems`, or -1 for none.
      const activeIndex = ref(-1);
      // Set when the user dismisses the open dropdown with Escape, so it stays
      // closed until they type or refocus.
      const dismissed = ref(false);

      // Content rows carry the link to follow, generated here rather than on click:
      // the back link records the state to return to, and for a suggestion that is
      // the search for the keyword which produced it — which is only known now, and
      // is never navigated to when the user picks a resource straight from the list.
      function _contentLink(id, backLinkQuery) {
        return genContentLinkBackLinkCurrentPage(id, true, undefined, backLinkQuery);
      }

      const historyItems = computed(() =>
        (get(resumableContentNodes) || []).slice(0, 5).map(item => ({
          ...item,
          link: _contentLink(item.id),
        })),
      );
      const recentSearchTerms = computed(() => get(recentSearches) || []);
      const currentSuggestions = computed(() => {
        const keywords = get(keywordsInput);
        return (get(autoCompleteSuggestions) || []).map(suggestion =>
          suggestion.type === 'content'
            ? { ...suggestion, link: _contentLink(suggestion.id, { ...route.query, keywords }) }
            : suggestion,
        );
      });

      const showDropdown = computed(() => {
        if (!get(isFocused) || get(dismissed)) {
          return false;
        }
        if (get(keywordsInput)) {
          // Typing state: show when we have suggestions
          return get(currentSuggestions).length > 0;
        }
        // Focus state (no query): show when we have history or recent searches
        return get(historyItems).length > 0 || get(recentSearchTerms).length > 0;
      });

      // Flat, ordered list of the rows the dropdown renders, used to drive
      // keyboard navigation. The order must match the option indices the
      // dropdown assigns: filter suggestions before content when typing,
      // history before recent searches otherwise.
      const navigableItems = computed(() => {
        if (get(keywordsInput)) {
          const suggestions = get(currentSuggestions);
          const filters = suggestions.filter(s => s.type !== 'content');
          const contents = suggestions.filter(s => s.type === 'content');
          return [
            ...filters.map(item => ({
              kind: item.type === 'combination' ? 'combination' : 'filter',
              item,
            })),
            ...contents.map(item => ({ kind: 'content', item })),
          ];
        }
        return [
          ...get(historyItems).map(item => ({ kind: 'content', item })),
          ...get(recentSearchTerms).map(item => ({ kind: 'search', item })),
        ];
      });

      // Announce the option count so screen reader users know the dropdown
      // opened and can arrow into it; per-option reading is handled by
      // aria-activedescendant on the input.
      const announceableCount = computed(() =>
        get(showDropdown) ? get(navigableItems).length : 0,
      );
      watch(announceableCount, count => {
        if (count > 0) {
          sendPoliteMessage(autocompleteResultsAvailable$({ count }));
        }
      });

      const activeOptionId = computed(() => {
        if (!get(showDropdown) || get(activeIndex) < 0) {
          return null;
        }
        return `${dropdownId}-option-${get(activeIndex)}`;
      });

      const highlightSegments = computed(() => {
        const hovered = get(hoveredFilter);
        if (!hovered || !get(keywordsInput)) {
          return null;
        }
        // A combination highlights every word its constituent filters match.
        const filters = hovered.type === 'combination' ? hovered.filters : hovered;
        return getMatchedWordSegments(get(keywordsInput), filters);
      });

      // Clear any keyboard selection and re-open a dropdown the user dismissed —
      // used when the set of rows changes (typing) or the input regains focus.
      function resetActiveOption() {
        set(activeIndex, -1);
        set(dismissed, false);
      }

      function handleInput(event) {
        const value = event.target.value;
        set(keywordsInput, value);
        resetActiveOption();
        keyWordAutoCompleteHandler(value);
      }

      // Blur the input so the next real focus event re-opens the dropdown —
      // DOM focus otherwise stays on the input and no further `focus` event
      // fires to flip `isFocused` back to true.
      function closeDropdown() {
        set(isFocused, false);
        const el = get(searchInput);
        if (el) {
          el.blur();
        }
      }

      function handleSubmit() {
        closeDropdown();
        if (get(keywordsInput)) {
          addSearch(get(keywordsInput));
        }
        setKeywords(get(keywordsInput));
      }

      function activateItem(navItem) {
        if (navItem.kind === 'content') {
          handleSelectContent(navItem.item);
        } else if (navItem.kind === 'search') {
          handleSelectSearch(navItem.item);
        } else if (navItem.kind === 'combination') {
          handleSelectCombination(navItem.item);
        } else {
          handleSelectFilter(navItem.item);
        }
      }

      // Move the text cursor to the end of the input, so returning to it from
      // the option list leaves the user ready to keep typing.
      function moveCaretToEnd() {
        const el = get(searchInput);
        if (el) {
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      }

      function handleKeydown(event) {
        const items = get(navigableItems);
        if (event.key === 'ArrowDown') {
          if (!get(showDropdown) || !items.length) {
            return;
          }
          event.preventDefault();
          // The input is index -1 in the cycle; wrap from the last option back to it
          const idx = get(activeIndex);
          if (idx >= items.length - 1) {
            set(activeIndex, -1);
            moveCaretToEnd();
          } else {
            set(activeIndex, idx + 1);
          }
        } else if (event.key === 'ArrowUp') {
          if (!get(showDropdown) || !items.length) {
            return;
          }
          event.preventDefault();
          const idx = get(activeIndex);
          if (idx === 0) {
            // Up from the first option returns focus to the input
            set(activeIndex, -1);
            moveCaretToEnd();
          } else if (idx < 0) {
            set(activeIndex, items.length - 1);
          } else {
            set(activeIndex, idx - 1);
          }
        } else if (event.key === 'Enter') {
          event.preventDefault();
          const index = get(activeIndex);
          if (get(showDropdown) && index >= 0 && index < items.length) {
            activateItem(items[index]);
          } else {
            handleSubmit();
          }
        } else if (event.key === 'Escape') {
          if (get(showDropdown)) {
            event.preventDefault();
            set(activeIndex, -1);
            set(dismissed, true);
          }
        }
      }

      function handleFocus() {
        set(isFocused, true);
        resetActiveOption();
      }

      let blurTimer = null;
      function handleBlur() {
        // Delay to allow click on dropdown items to register before hiding
        blurTimer = setTimeout(() => {
          set(isFocused, false);
        }, 200);
      }
      onUnmounted(() => {
        clearTimeout(blurTimer);
      });

      function handleSelectContent(item) {
        closeDropdown();
        router.push(item.link);
      }

      function handleSelectSearch(term) {
        closeDropdown();
        // Re-rank to most-recent, matching handleSubmit, so picking a term from
        // the dropdown keeps the list sorted by recency.
        addSearch(term);
        setKeywords(term);
      }

      function handleSelectFilter(filter) {
        set(hoveredFilter, null);
        closeDropdown();
        selectFilterSuggestion(filter);
      }

      function handleSelectCombination(item) {
        set(hoveredFilter, null);
        closeDropdown();
        selectFilterCombination(item.filters);
      }

      function handleHoverFilter(filter) {
        set(hoveredFilter, filter);
      }

      function handleClear() {
        clearKeywords();
        keyWordAutoCompleteHandler('');
        get(searchInput).focus();
      }

      return {
        inputId,
        dropdownId,
        activeIndex,
        activeOptionId,
        searchInput,
        keywordsInput,
        historyItems,
        recentSearchTerms,
        currentSuggestions,
        showDropdown,
        highlightSegments,
        handleInput,
        handleKeydown,
        handleSubmit,
        handleFocus,
        handleBlur,
        handleSelectContent,
        handleSelectSearch,
        handleSelectFilter,
        handleSelectCombination,
        handleHoverFilter,
        handleClear,
        searchLabel$,
        findSomethingToLearn$,
        clearAction$,
        startSearchButtonLabel$,
      };
    },
    props: {
      placeholder: {
        type: String,
        default: '',
      },
    },
    computed: {
      placeholderStyle() {
        // Browsers apply their own ::placeholder colour rather than inheriting the
        // input's, and theirs does not meet contrast requirements.
        return { '::placeholder': { color: this.$themeTokens.annotation, opacity: 1 } };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .library-search-bar {
    position: relative;
    width: 100%;
  }

  .search-row {
    position: relative;
    display: flex;
    align-items: center;
    height: 48px;
    border: 1px solid;
    border-radius: 8px;
  }

  .search-submit-button {
    align-self: stretch;
    min-width: 64px;
    height: auto;
    padding: 0;
    border-radius: 0 8px 8px 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 12px;
    font-size: 16px;
    background: transparent;
    border: 0;
    outline: none;

    /* Remove browser-default search input clear icon */
    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  .search-actions {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    align-items: center;
    align-self: stretch;
  }

  .search-input-overlay {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 16px;
    color: transparent;

    /* Preserve inter-word spaces so segments line up with the real input text;
       flex items collapse whitespace-only spans otherwise, shifting later
       words left. */
    white-space: pre;
    pointer-events: none;
  }

  .highlight-matched {
    padding: 1px 0;
    border-radius: 3px;
    opacity: 0.5;
  }

</style>
