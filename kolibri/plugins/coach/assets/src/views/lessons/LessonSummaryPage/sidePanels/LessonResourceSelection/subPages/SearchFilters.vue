<template>

  <SearchFiltersPanel
    ref="searchFiltersPanel"
    v-model="searchTermsComputed"
    accordion
    showChannels
    showActivities
    :title="topic && searchInFolder$({ folder: topic.title })"
    @categorySearchOpen="handleCategorySearchOpen"
  />

</template>


<script>

  import { getCurrentInstance } from 'vue';

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import SearchFiltersPanel from 'kolibri-common/components/SearchFiltersPanel/index.vue';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { PageNames } from '../../../../../../constants';
  import { useGoBack } from '../../../../../../composables/usePreviousRoute';

  /**
   * @typedef {import('../../../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SearchFilters',
    components: {
      SearchFiltersPanel,
    },
    setup(props) {
      const instance = getCurrentInstance();
      const { searchLabel$ } = coreStrings;
      const { chooseACategory$ } = searchAndFilterStrings;

      const title = searchLabel$();
      const goBack = useGoBack({
        fallbackRoute: {
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        },
      });
      props.setTitle(title);
      props.setGoBack(goBack);

      function handleCategorySearchOpen(isOpen) {
        if (isOpen) {
          props.setTitle(chooseACategory$());
          props.setGoBack(() => {
            const searchFiltersPanelRef = instance.proxy.$refs.searchFiltersPanel;
            searchFiltersPanelRef.closeCategorySearch();
          });
        } else {
          props.setTitle(title);
          props.setGoBack(goBack);
        }
      }

      // Fetch first available labels of the selected topic
      props.searchFetch.fetchData();

      const { searchInFolder$ } = searchAndFilterStrings;

      return {
        searchInFolder$,
        handleCategorySearchOpen,
      };
    },
    props: {
      setTitle: {
        type: Function,
        default: () => {},
      },
      setGoBack: {
        type: Function,
        default: () => {},
      },
      searchTerms: {
        type: Object,
        required: true,
      },
      /**
       * Fetch object for fetching search results.
       * @type {FetchObject}
       */
      searchFetch: {
        type: Object,
        required: true,
      },
      topic: {
        type: Object,
        required: false,
        default: null,
      },
    },
    computed: {
      searchTermsComputed: {
        get() {
          return this.searchTerms;
        },
        set(value) {
          this.$emit('update:searchTerms', value);
        },
      },
    },
  };

</script>


<style lang="scss" scoped>

  .side-panel-subtitle {
    margin-bottom: 24px;
    font-size: 16px;
    font-weight: 600;
  }

  /deep/ .search-box-row {
    max-width: unset !important;
  }

  /deep/ h2 {
    font-size: 16px;
    font-weight: 600;
  }

</style>
