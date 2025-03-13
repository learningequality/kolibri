<template>

  <div v-if="displayingSearchResults">
    <div class="channels-header">
      <span class="side-panel-subtitle">
        {{ selectFromChannels$() }}
      </span>
      <KButton
        icon="filter"
        :text="searchLabel$()"
        @click="onSearchClick"
      />
    </div>

    <div class="mb-16 side-panel-subtitle">
      {{ resultsCountMessage }}
    </div>

    <SearchChips
      class="mb-16"
      :searchTerms="searchTerms"
      @removeItem="onRemoveSearchFilterTag"
      @clearSearch="onClearSearch"
    />

    <UpdatedResourceSelection
      :contentList="contentList"
      :hasMore="hasMore"
      :cardsHeadingLevel="2"
      :fetchMore="fetchMore"
      :loadingMore="loadingMore"
      :selectionRules="selectionRules"
      :selectedResources="selectedResources"
      :getTopicLink="getTopicLink"
      :getResourceLink="getResourceLink"
      @selectResources="$emit('selectResources', $event)"
      @deselectResources="$emit('deselectResources', $event)"
    />
  </div>

</template>


<script>

  import { getCurrentInstance } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import SearchChips from 'kolibri-common/components/SearchChips';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { PageNames } from '../../../../../../constants';
  import UpdatedResourceSelection from '../../../../../common/resourceSelection/UpdatedResourceSelection.vue';

  export default {
    name: 'SelectFromQuizSearchResults',
    components: {
      SearchChips,
      UpdatedResourceSelection,
    },
    setup(props) {
      const instance = getCurrentInstance();
      function redirectBack() {
        const { topicId } = instance.proxy.$route.query;
        if (topicId) {
          instance.proxy.$router.push({
            name: PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
            query: {
              topicId,
            },
          });
          return;
        }
        instance.proxy.$router.push({
          name: PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
        });
      }
      if (!props.displayingSearchResults) {
        redirectBack();
      }

      const { selectFromChannels$, searchLabel$ } = coreStrings;
      const { selectPracticeQuizLabel$ } = enhancedQuizManagementStrings;

      props.setTitle(selectPracticeQuizLabel$());
      props.setGoBack(null);

      const { data, hasMore, fetchMore, loadingMore } = props.searchFetch;
      return {
        contentList: data,
        hasMore,
        fetchMore,
        loadingMore,
        searchLabel$,
        selectFromChannels$,
        redirectBack,
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
      /**
       * Fetch object for fetching search results.
       * @type {FetchObject}
       */
      searchFetch: {
        type: Object,
        required: true,
      },
      selectionRules: {
        type: Array,
        required: false,
        default: () => [],
      },
      selectedResources: {
        type: Array,
        required: true,
      },
      searchTerms: {
        type: Object,
        required: true,
      },
      displayingSearchResults: {
        type: Boolean,
        required: true,
      },
      topic: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * Function that receives a resourceId and returns a link to the resource.
       */
      getResourceLink: {
        type: Function,
        required: true,
      },
    },
    computed: {
      resultsCountMessage() {
        const {
          resultsCount$,
          overResultsCount$,
          resultsCountInFolder$,
          overResultsCountInFolder$,
        } = searchAndFilterStrings;

        const count = this.contentList.length;
        if (this.topic) {
          const params = {
            count,
            folder: this.topic.title,
          };
          return this.hasMore ? overResultsCountInFolder$(params) : resultsCountInFolder$(params);
        }
        return this.hasMore ? overResultsCount$({ count }) : resultsCount$({ count });
      },
    },
    methods: {
      onSearchClick() {
        this.$router.push({
          name: PageNames.QUIZ_SELECT_RESOURCES_SEARCH,
          query: { ...this.$route.query, filter_quiz: true },
        });
      },
      onClearSearch() {
        this.$emit('clearSearch');
        this.redirectBack();
      },
      onRemoveSearchFilterTag(item, { isLast }) {
        this.$emit('removeSearchFilterTag', item);
        if (isLast) {
          this.redirectBack();
        }
      },
      getTopicLink(topicId) {
        return {
          name: PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
          query: {
            ...this.$route.query,
            topicId,
            searchResultTopicId: topicId,
            searchTopicId: this.$route.query.topicId,
          },
        };
      },
    },
  };

</script>


<style scoped lang="scss">

  .side-panel-subtitle {
    font-size: 16px;
    font-weight: 600;
  }

  .channels-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .mr-8 {
    margin-right: 8px;
  }

  .mb-16 {
    margin-bottom: 16px;
  }

  // UpdatedResourceSelection has an ul that adds unnecessary margin
  /deep/ ul {
    margin-top: 0;
  }

</style>
