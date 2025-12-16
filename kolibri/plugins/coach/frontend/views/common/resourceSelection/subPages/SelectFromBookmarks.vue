<template>

  <div>
    <QuizResourceSelectionHeader
      v-if="target === SelectionTarget.QUIZ && !settings.selectPracticeQuiz"
      class="mb-16"
      hideSearch
      :settings="settings"
    />
    <UpdatedResourceSelection
      canSelectAll
      :isSelectable="isSelectable"
      :contentList="contentList"
      :hasMore="hasMore"
      :disabled="disabled"
      :channelsLink="channelsLink"
      :fetchMore="fetchMore"
      :loadingMore="loadingMore"
      :multi="!settings?.selectPracticeQuiz"
      :selectionRules="selectionRules"
      :selectAllRules="selectAllRules"
      :getResourceLink="getResourceLink"
      :selectedResources="selectedResources"
      :contentCardMessage="wrappedContentCardMessage"
      :unselectableResourceIds="unselectableResourceIds"
      @selectResources="$emit('selectResources', $event)"
      @deselectResources="$emit('deselectResources', $event)"
      @setSelectedResources="$emit('setSelectedResources', $event)"
    />
  </div>

</template>


<script>

  import { computed, getCurrentInstance } from 'vue';
  import { now } from 'kolibri/utils/serverClock';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute.js';
  import UpdatedResourceSelection from '../UpdatedResourceSelection.vue';
  import { PageNames } from '../../../../constants';
  import { SelectionTarget } from '../contants';
  import QuizResourceSelectionHeader from '../QuizResourceSelectionHeader.vue';

  /**
   * @typedef {import('../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectFromBookmarks',
    components: {
      UpdatedResourceSelection,
      QuizResourceSelectionHeader,
    },
    setup(props) {
      const { selectFromBookmarks$, bookmarkedTimeAgoLabel$ } = coreStrings;
      const instance = getCurrentInstance();

      props.setTitle(selectFromBookmarks$());

      const goBack = useGoBack({
        fallbackRoute: {
          name:
            props.target === SelectionTarget.LESSON
              ? PageNames.LESSON_SELECT_RESOURCES_INDEX
              : PageNames.QUIZ_SELECT_RESOURCES_INDEX,
        },
      });

      props.setGoBack(goBack);

      const channelsLink = {
        name:
          props.target === SelectionTarget.LESSON
            ? PageNames.LESSON_SELECT_RESOURCES_INDEX
            : PageNames.QUIZ_SELECT_RESOURCES_INDEX,
      };

      const { data, hasMore, fetchMore, loadingMore } = props.bookmarksFetch;

      const wrappedContentCardMessage = content => {
        const propsMessage = props.contentCardMessage(content);
        if (propsMessage) {
          return propsMessage;
        }
        if (!content.bookmark?.created) {
          return null;
        }
        const createdDate = new Date(content.bookmark.created);
        const time = instance.proxy.$formatRelative(createdDate, { now: now() });

        return bookmarkedTimeAgoLabel$({ time });
      };

      const isSelectable = computed(() => {
        if (props.target === SelectionTarget.LESSON) {
          return true;
        }
        // if choosing manually for quizzes, dont allow selecting resources
        return !props.settings.isChoosingManually;
      });

      return {
        channelsLink,
        contentList: data,
        hasMore,
        fetchMore,
        loadingMore,
        isSelectable,
        wrappedContentCardMessage,
        SelectionTarget,
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
       * Fetch object for fetching bookmarks.
       * @type {FetchObject}
       */
      bookmarksFetch: {
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
        default: () => {},
      },
      /**
       * Function that receives a resourceId and returns a link to the resource.
       */
      getResourceLink: {
        type: Function,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .mb-16 {
    margin-bottom: 16px;
  }

</style>
