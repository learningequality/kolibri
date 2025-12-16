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
      :isSelectable="isSelectable"
      :disabled="disabled"
      :contentList="contentList"
      :hasMore="hasMore"
      :cardsHeadingLevel="2"
      :fetchMore="fetchMore"
      :loadingMore="loadingMore"
      :selectionRules="selectionRules"
      :selectedResources="selectedResources"
      :getTopicLink="getTopicLink"
      :getResourceLink="getResourceLink"
      :contentCardMessage="contentCardMessage"
      :unselectableResourceIds="unselectableResourceIds"
      @selectResources="$emit('selectResources', $event)"
      @deselectResources="$emit('deselectResources', $event)"
    />
  </div>

</template>


<script>

  import { computed, getCurrentInstance } from 'vue';

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import SearchChips from 'kolibri-common/components/SearchChips';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { PageNames } from '../../../../../../constants';
  import { coachStrings } from '../../../../../common/commonCoachStrings';
  import UpdatedResourceSelection from '../../../../../common/resourceSelection/UpdatedResourceSelection.vue';
  import { SelectionTarget } from '../../../../../common/resourceSelection/contants';

  /**
   * @typedef {import('../../../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectFromSearchResults',
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
            name: PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
            query: {
              topicId,
            },
          });
          return;
        }
        instance.proxy.$router.push({
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        });
      }
      if (!props.displayingSearchResults) {
        redirectBack();
      }

      const { selectFromChannels$, searchLabel$ } = coreStrings;
      const { manageLessonResourcesTitle$ } = coachStrings;

      props.setTitle(manageLessonResourcesTitle$());
      props.setGoBack(null);

      const isSelectable = computed(() => {
        if (props.target === SelectionTarget.LESSON) {
          return true;
        }
        // if choosing manually for quizzes, dont allow selecting resources
        return !props.settings.isChoosingManually;
      });

      const { data, hasMore, fetchMore, loadingMore } = props.searchFetch;
      return {
        contentList: data,
        hasMore,
        fetchMore,
        loadingMore,
        isSelectable,
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
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * The target entity for the selection.
       * It can be either 'quiz' or 'lesson'.
       */
      target: {
        type: String,
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
       * Function that receives a resourceId and returns a link to the resource.
       */
      getResourceLink: {
        type: Function,
        required: true,
      },
      unselectableResourceIds: {
        type: Array,
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
          name: PageNames.LESSON_SELECT_RESOURCES_SEARCH,
          query: this.$route.query,
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
          name: PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
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
