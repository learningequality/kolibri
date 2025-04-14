<template>

  <div v-if="displayingSearchResults">
    <QuizResourceSelectionHeader
      v-if="!settings.selectPracticeQuiz"
      class="mb-16"
      :settings="settings"
      @searchClick="onSearchClick"
    />

    <div
      v-else
      class="d-flex-end mb-16"
    >
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
      :disabled="disabled"
      :isSelectable="!settings.isChoosingManually"
      :contentList="contentList"
      :hasMore="hasMore"
      :cardsHeadingLevel="2"
      :fetchMore="fetchMore"
      :loadingMore="loadingMore"
      :multi="!settings?.selectPracticeQuiz"
      :selectionRules="selectionRules"
      :selectedResources="selectedResources"
      :getTopicLink="getTopicLink"
      :getResourceLink="getResourceLink"
      :contentCardMessage="contentCardMessage"
      :unselectableResourceIds="unselectableResourceIds"
      @selectResources="$emit('selectResources', $event)"
      @deselectResources="$emit('deselectResources', $event)"
      @setSelectedResources="$emit('setSelectedResources', $event)"
    />
  </div>

</template>


<script>

  import { getCurrentInstance } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import SearchChips from 'kolibri-common/components/SearchChips';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { PageNames } from '../../../../../../constants';
  import UpdatedResourceSelection from '../../../../../common/resourceSelection/UpdatedResourceSelection.vue';
  import QuizResourceSelectionHeader from '../../../../../common/resourceSelection/QuizResourceSelectionHeader.vue';

  export default {
    name: 'SelectFromQuizSearchResults',
    components: {
      QuizResourceSelectionHeader,
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

      const { searchLabel$ } = coreStrings;

      props.setTitle(props.defaultTitle);
      props.setGoBack(null);

      const { data, hasMore, fetchMore, loadingMore } = props.searchFetch;
      return {
        contentList: data,
        hasMore,
        fetchMore,
        loadingMore,
        searchLabel$,
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
      defaultTitle: {
        type: String,
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
      selectionRules: {
        type: Array,
        required: false,
        default: () => [],
      },
      selectedResources: {
        type: Array,
        required: true,
      },
      unselectableResourceIds: {
        type: Array,
        required: false,
        default: null,
      },
      disabled: {
        type: Boolean,
        default: false,
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
      /**
       * Selection settings used for quizzes.
       */
      settings: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * Function that returns a message to be displayed based in the content
       * passed as argument.
       */
      contentCardMessage: {
        type: Function,
        required: false,
        default: () => '',
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
