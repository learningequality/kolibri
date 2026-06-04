import { watch } from 'vue';
import { get } from '@vueuse/core';
import { SearcherFactory, Query, Config } from '@m31coding/fuzzy-search';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';

// Translated words that should also match a learning activity in autocomplete,
// keyed by activity. Built from search strings so they can be localised.
// Generation is deferred to first use (so i18n is ready) then cached for the
// page's lifetime — locale switching triggers a full reload, so it never
// goes stale. The matchers call this once per word on every hover/selection.
let _synonymsCache = null;
function _activitySynonyms() {
  if (_synonymsCache) {
    return _synonymsCache;
  }
  const s = searchAndFilterStrings;
  _synonymsCache = {
    WATCH: [
      s.searchTermVideo$(),
      s.searchTermMovie$(),
      s.searchTermFilm$(),
      s.searchTermAnimation$(),
    ],
    LISTEN: [
      s.searchTermAudio$(),
      s.searchTermPodcast$(),
      s.searchTermMusic$(),
      s.searchTermSong$(),
    ],
    READ: [
      s.searchTermBook$(),
      s.searchTermArticle$(),
      s.searchTermText$(),
      s.searchTermDocument$(),
      s.searchTermStory$(),
    ],
    PRACTICE: [
      s.searchTermExercise$(),
      s.searchTermQuiz$(),
      s.searchTermTest$(),
      s.searchTermDrill$(),
      s.searchTermWorksheet$(),
    ],
    CREATE: [
      s.searchTermMake$(),
      s.searchTermBuild$(),
      s.searchTermDraw$(),
      s.searchTermDesign$(),
      s.searchTermCraft$(),
    ],
    EXPLORE: [s.searchTermInteractive$(), s.searchTermGame$(), s.searchTermSimulation$()],
    REFLECT: [s.searchTermJournal$(), s.searchTermReview$(), s.searchTermSelfAssessment$()],
  };
  return _synonymsCache;
}

// Create a config that supports non-Latin scripts (Arabic, Cyrillic, Han, etc.)
function _createSearcherConfig() {
  const config = Config.createDefaultConfig();
  // Allow all Unicode characters for multilingual support
  config.normalizerConfig.allowCharacter = () => true;
  return config;
}

/**
 * Composable for fuzzy matching against translated metadata labels.
 *
 * Builds a searchable index from the available labels in the current search context
 * (learning activities, categories, grade levels, accessibility options, resources
 * needed, languages) and provides instant client-side fuzzy matching.
 * @param {import('vue').Ref} searchableLabels - globalLabels ref from useBaseSearch
 * @returns {{ search: (query: string) => Array<{label, filterKey, filterValue, type}> }}
 */
export default function useFuzzyMetadataSearch(searchableLabels) {
  const searcherConfig = _createSearcherConfig();
  let searcher = SearcherFactory.createSearcher(searcherConfig);
  let entityList = [];
  let indexDirty = false;

  function _buildIndex() {
    const labels = get(searchableLabels);
    if (!labels) return;

    entityList = [];
    let idCounter = 0;

    // Learning activities: { KEY: value } mapping
    if (labels.learningActivitiesShown) {
      for (const [key, value] of Object.entries(labels.learningActivitiesShown)) {
        entityList.push({
          id: idCounter++,
          key,
          label: coreString(key),
          filterKey: 'learning_activities',
          filterValue: value,
          type: 'activity',
        });
      }
    }

    // Categories: nested { Label: { value, nested: {...} } } structure
    if (labels.libraryCategories) {
      _flattenCategories(labels.libraryCategories, entityList, idCounter);
      idCounter = entityList.length;
    }

    // Grade levels: array of SCREAMING_SNAKE keys
    if (labels.gradeLevelsList) {
      for (const key of labels.gradeLevelsList) {
        entityList.push({
          id: idCounter++,
          label: coreString(key),
          filterKey: 'grade_levels',
          filterValue: key,
          type: 'grade_level',
        });
      }
    }

    // Accessibility options: array of SCREAMING_SNAKE keys
    if (labels.accessibilityOptionsList) {
      for (const key of labels.accessibilityOptionsList) {
        entityList.push({
          id: idCounter++,
          label: coreString(key),
          filterKey: 'accessibility_labels',
          filterValue: key,
          type: 'accessibility',
        });
      }
    }

    // Resources needed: { KEY: value } mapping
    if (labels.resourcesNeeded) {
      for (const [key, value] of Object.entries(labels.resourcesNeeded)) {
        entityList.push({
          id: idCounter++,
          label: coreString(key),
          filterKey: 'learner_needs',
          filterValue: value,
          type: 'resource',
        });
      }
    }

    // Languages: array of { id, lang_name } objects
    if (labels.languagesList) {
      for (const lang of labels.languagesList) {
        entityList.push({
          id: idCounter++,
          label: lang.lang_name || lang.id,
          filterKey: 'languages',
          filterValue: lang.id,
          type: 'language',
        });
      }
    }

    // Rebuild the searcher index
    searcher = SearcherFactory.createSearcher(searcherConfig);
    if (entityList.length > 0) {
      const synonyms = _activitySynonyms();
      searcher.indexEntities(
        entityList,
        e => e.id,
        e => {
          const terms = [e.label];
          if (e.type === 'activity' && synonyms[e.key]) {
            terms.push(...synonyms[e.key]);
          }
          return terms;
        },
      );
    }
  }

  // Build index initially and mark dirty when labels change. The labels ref
  // is only ever reassigned wholesale, so a shallow watch suffices.
  _buildIndex();
  watch(searchableLabels, () => {
    indexDirty = true;
  });

  /**
   * Search the metadata labels index with fuzzy matching.
   * @param {string} query - Search query string
   * @returns {Array<{label, filterKey, filterValue, type}>}
   */
  function search(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Rebuild index lazily if labels have changed
    if (indexDirty) {
      _buildIndex();
      indexDirty = false;
    }

    const result = searcher.getMatches(new Query(query, 3));
    return result.matches.map(match => match.entity);
  }

  // A word "matched" the filter if either:
  //   - it prefixes one of the filter's terms
  //   - running the word alone through the fuzzy searcher surfaces this filter
  // The fuzzy path handles typos, missing accents, and unlisted synonyms.
  function _wordMatchesFilter(word, filter, terms) {
    const lower = word.toLowerCase();
    if (!lower) {
      return false;
    }
    if (terms.some(term => term.startsWith(lower) || lower.startsWith(term))) {
      return true;
    }
    return search(word).some(
      m => m.filterKey === filter.filterKey && m.filterValue === filter.filterValue,
    );
  }

  /**
   * Given the current keywords and a selected filter, remove the word(s)
   * from keywords that triggered the match for that filter.
   * @param {string} keywords - Current search keywords string
   * @param {object} filter - The selected filter entity
   * @returns {string} Keywords with matched words removed
   */
  function removeMatchedWords(keywords, filter) {
    if (!keywords || !filter) return keywords || '';
    const terms = _getMatchableTerms(filter);
    const inputWords = keywords.split(/\s+/);
    const remaining = inputWords.filter(word => !_wordMatchesFilter(word, filter, terms));
    return remaining.join(' ').trim();
  }

  /**
   * Split keywords into segments indicating which words match the given
   * filter(s), for the search-input highlight overlay. Uses the same matcher as
   * removeMatchedWords, so what is highlighted is exactly what selection strips.
   * Accepts a single filter or a list (e.g. a combination suggestion), marking a
   * word matched when it matches any of them.
   * @param {string} keywords - Current search keywords string
   * @param {object|object[]} filter - The filter entity (or entities) being hovered
   * @returns {Array<{text: string, matched: boolean}>} Segments, whitespace preserved
   */
  function getMatchedWordSegments(keywords, filter) {
    if (!keywords || !filter) return [{ text: keywords || '', matched: false }];
    const filters = Array.isArray(filter) ? filter : [filter];
    const withTerms = filters.map(f => ({ filter: f, terms: _getMatchableTerms(f) }));
    // Split while preserving whitespace as separate segments
    const tokens = keywords.split(/(\s+)/);
    return tokens.map(token => {
      if (/^\s+$/.test(token)) {
        return { text: token, matched: false };
      }
      const matched = withTerms.some(({ filter: f, terms }) => _wordMatchesFilter(token, f, terms));
      return { text: token, matched };
    });
  }

  // From an ordered list of matches, keep only those that fuzzy-match a query
  // word no higher-ranked match already claimed. Two filters matching the same
  // word are competing interpretations of one term, not a refinement, so only
  // the higher-ranked one survives.
  function _distinctTermFilters(query, matches) {
    const claimed = new Set();
    const filters = [];
    for (const match of matches) {
      const terms = _getMatchableTerms(match);
      const words = query
        .split(/\s+/)
        .map(word => word.toLowerCase())
        .filter(word => word && _wordMatchesFilter(word, match, terms));
      if (words.some(word => !claimed.has(word))) {
        words.forEach(word => claimed.add(word));
        filters.push(match);
      }
    }
    return filters;
  }

  /**
   * Fuzzy matches to show in autocomplete, with a leading "combination"
   * suggestion when the matches key off distinct words in the query — applying
   * every filter at once only makes sense as a refinement across terms.
   * @param {string} query - Search query string
   * @returns {Array} matches, optionally prefixed with a { type: 'combination', filters } entry
   */
  function autoCompleteSuggestions(query) {
    const matches = search(query);
    const combinationFilters = _distinctTermFilters(query, matches);
    return combinationFilters.length > 1
      ? [{ type: 'combination', filters: combinationFilters }, ...matches]
      : matches;
  }

  return { search, removeMatchedWords, getMatchedWordSegments, autoCompleteSuggestions };
}

/**
 * Build a list of lowercase terms that a filter could have been matched by.
 * Includes the full label, individual words of multi-word labels,
 * and activity synonyms where applicable.
 * @param {object} filter - filter entity to derive terms from
 * @returns {string[]} lowercase terms that could have matched the filter
 */
function _getMatchableTerms(filter) {
  const terms = [filter.label.toLowerCase()];
  const words = filter.label.toLowerCase().split(/\s+/);
  if (words.length > 1) terms.push(...words);
  const synonyms = filter.key && _activitySynonyms()[filter.key];
  if (filter.type === 'activity' && synonyms) {
    terms.push(...synonyms.map(s => s.toLowerCase()));
  }
  return terms;
}

/**
 * Recursively flatten nested category structure into a flat list.
 * @param {object} categories - nested { label: { value, nested } } structure
 * @param {Array} list - accumulator appended to in place
 * @param {number} startId - first id to assign to flattened entries
 * @returns {number} next unused id
 */
function _flattenCategories(categories, list, startId) {
  let id = startId;
  for (const [key, info] of Object.entries(categories)) {
    list.push({
      id: id++,
      key,
      label: coreString(key),
      filterKey: 'categories',
      filterValue: info.value,
      type: 'category',
    });
    if (info.nested && Object.keys(info.nested).length > 0) {
      id = _flattenCategories(info.nested, list, id);
    }
  }
  return id;
}
