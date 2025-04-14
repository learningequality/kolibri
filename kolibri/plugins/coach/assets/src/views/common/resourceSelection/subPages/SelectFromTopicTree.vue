<template>

  <div v-if="topic">
    <template v-if="!isTopicFromSearchResult">
      <div
        v-if="target === SelectionTarget.LESSON"
        class="subheader"
      >
        <span class="side-panel-subtitle">
          {{ selectFromChannels$() }}
        </span>
        <KButton
          icon="filter"
          :text="searchLabel$()"
          @click="onSearchClick"
        />
      </div>

      <QuizResourceSelectionHeader
        v-if="target === SelectionTarget.QUIZ && !settings.selectPracticeQuiz"
        class="mb-16"
        :settings="settings"
        @searchClick="onSearchClick"
      />

      <div
        v-if="target === SelectionTarget.QUIZ && settings.selectPracticeQuiz"
        class="d-flex-end mb-16"
      >
        <KButton
          icon="filter"
          :text="searchLabel$()"
          @click="onSearchClick"
        />
      </div>
    </template>

    <div class="topic-info">
      <h2>
        <KIcon
          icon="topic"
          class="mr-8"
        />
        <span>
          {{ topic.title }}
        </span>
      </h2>
      <p :style="{ color: $themeTokens.annotation }">
        {{ topic.description }}
      </p>
    </div>

    <UpdatedResourceSelection
      canSelectAll
      :isSelectable="isSelectable"
      :topic="computedTopic"
      :disabled="disabled"
      :contentList="contentList"
      :hasMore="hasMore"
      :fetchMore="fetchMore"
      :loadingMore="loadingMore"
      :multi="!settings?.selectPracticeQuiz"
      :selectionRules="selectionRules"
      :selectAllRules="selectAllRules"
      :selectedResources="selectedResources"
      :hideBreadcrumbs="hideBreadcrumbs"
      :channelsLink="breadcrumbChannelsLink"
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

  import { computed, getCurrentInstance } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { PageNames } from '../../../../constants';
  import UpdatedResourceSelection from '../UpdatedResourceSelection.vue';
  import QuizResourceSelectionHeader from '../QuizResourceSelectionHeader.vue';
  import { SelectionTarget } from '../contants';

  /**
   * @typedef {import('../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectFromTopicTree',
    components: {
      UpdatedResourceSelection,
      QuizResourceSelectionHeader,
    },
    setup(props) {
      const { selectFromChannels$, searchLabel$ } = coreStrings;
      const instance = getCurrentInstance();

      const { backToSearchResultsLabel$ } = searchAndFilterStrings;

      const routeQuery = instance.proxy.$route.query;
      const isTopicFromSearchResult = computed(() => !!routeQuery.searchResultTopicId);

      const getTitle = () => {
        if (isTopicFromSearchResult.value) {
          return backToSearchResultsLabel$();
        }
        return props.defaultTitle;
      };
      props.setTitle(getTitle());

      const redirectBack = () => {
        const { searchTopicId } = routeQuery;
        if (!isTopicFromSearchResult.value) {
          if (props.topic?.parent) {
            return instance.proxy.$router.push({
              name:
                props.target === SelectionTarget.LESSON
                  ? PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE
                  : PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
              query: {
                topicId: props.topic.parent,
              },
            });
          }
          return instance.proxy.$router.push({
            name:
              props.target === SelectionTarget.LESSON
                ? PageNames.LESSON_SELECT_RESOURCES_INDEX
                : PageNames.QUIZ_SELECT_RESOURCES_INDEX,
          });
        }

        const query = { ...instance.proxy.$route.query };
        query.topicId = searchTopicId;
        delete query.searchTopicId;
        delete query.searchResultTopicId;
        instance.proxy.$router.push({
          name:
            props.target === SelectionTarget.LESSON
              ? PageNames.LESSON_SELECT_RESOURCES_SEARCH_RESULTS
              : PageNames.QUIZ_SELECT_RESOURCES_SEARCH_RESULTS,
          query,
        });
      };
      const { topicId } = instance.proxy.$route.query;
      if (!topicId) {
        redirectBack();
      }
      props.setGoBack(redirectBack);

      const computedTopic = computed(() => {
        if (!isTopicFromSearchResult.value) {
          return props.topic;
        }
        // When we are showing the topic tree of a folder that was found in search results,
        // we want to show just the ancestors starting from the search result topic. So lets
        // slice the ancestors array to start from the search result topic.
        const { searchResultTopicId } = routeQuery;
        const topicAncestors = props.topic.ancestors;
        const searchResultTopicIndex = topicAncestors.findIndex(
          ({ id }) => id === searchResultTopicId,
        );
        const newAncestors =
          searchResultTopicIndex === -1 ? [] : topicAncestors.slice(searchResultTopicIndex);
        return {
          ...props.topic,
          ancestors: newAncestors,
        };
      });

      const isSelectable = computed(() => {
        if (props.target === SelectionTarget.LESSON) {
          return true;
        }
        // if choosing manually for quizzes, dont allow selecting resources
        return !props.settings.isChoosingManually;
      });

      const { data, hasMore, fetchMore, loadingMore } = props.treeFetch;
      return {
        contentList: data,
        hasMore,
        fetchMore,
        loadingMore,
        SelectionTarget,
        isSelectable,
        computedTopic,
        isTopicFromSearchResult,
        searchLabel$,
        selectFromChannels$,
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
      topic: {
        type: Object,
        required: true,
      },
      /**
       * Fetch object for fetching resource tree.
       * @type {FetchObject}
       */
      treeFetch: {
        type: Object,
        required: true,
      },
      selectionRules: {
        type: Array,
        required: false,
        default: () => [],
      },
      selectAllRules: {
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
       * Function that returns a message to be displayed based in the content
       * passed as argument.
       */
      contentCardMessage: {
        type: Function,
        required: false,
        default: () => '',
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
      breadcrumbChannelsLink() {
        if (this.isTopicFromSearchResult) {
          // Dont show chanell breadcrumb if topic is from search result
          return null;
        }
        return {
          name:
            this.target === SelectionTarget.LESSON
              ? PageNames.LESSON_SELECT_RESOURCES_INDEX
              : PageNames.QUIZ_SELECT_RESOURCES_INDEX,
        };
      },
      hideBreadcrumbs() {
        return this.isTopicFromSearchResult && this.computedTopic.ancestors.length === 0;
      },
    },
    methods: {
      onSearchClick() {
        this.$router.push({
          name:
            this.target === SelectionTarget.LESSON
              ? PageNames.LESSON_SELECT_RESOURCES_SEARCH
              : PageNames.QUIZ_SELECT_RESOURCES_SEARCH,
          query: this.$route.query,
        });
      },
    },
  };

</script>


<style scoped>

  .d-flex-end {
    display: flex;
    justify-content: flex-end;
  }

  .mb-16 {
    margin-bottom: 16px;
  }

  .mr-8 {
    margin-right: 8px;
  }

  .side-panel-subtitle {
    margin: 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .subheader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .topic-info h2 {
    margin: 0;
  }

</style>
