<template>

  <div>
    <QuizResourceSelectionHeader
      v-if="target === SelectionTarget.QUIZ && !settings.selectPracticeQuiz"
      class="mb-24"
      :settings="settings"
      :hideSearch="channels.length === 0"
      @searchClick="onSearchClick"
    />
    <!-- flexDirection is set to row-reverse to align the search button to the right
         when we have no bookmarks and thus, no selectFromBookmarks$ string -->
    <div
      v-if="target === SelectionTarget.LESSON"
      class="subheader"
      :style="{
        flexDirection: bookmarksCount > 0 ? 'row' : 'row-reverse',
      }"
    >
      <div
        v-if="bookmarksCount > 0"
        class="side-panel-subtitle"
      >
        {{ selectFromBookmarks$() }}
      </div>
      <KButton
        v-if="channels.length > 0"
        icon="filter"
        :text="searchLabel$()"
        @click="onSearchClick"
      />
    </div>

    <div
      v-if="target === SelectionTarget.QUIZ && settings.selectPracticeQuiz"
      class="d-flex-end mb-24"
    >
      <KButton
        v-if="channels.length > 0"
        icon="filter"
        :text="searchLabel$()"
        @click="onSearchClick"
      />
    </div>

    <div
      v-if="bookmarksCount > 0"
      class="mb-24"
    >
      <KCardGrid layout="1-1-1">
        <KCard
          :title="bookmarksLabel$()"
          :headingLevel="3"
          orientation="horizontal"
          thumbnailDisplay="large"
          thumbnailAlign="right"
          :style="{
            height: '172px',
          }"
          :to="selectFromBookmarksLink"
        >
          <template #thumbnailPlaceholder>
            <KIcon
              :style="{
                fontSize: '48px',
              }"
              icon="bookmark"
              :color="$themePalette.grey.v_700"
            />
          </template>
          <template #belowTitle>
            <KTextTruncator
              v-if="wrappedBookmarksCardMessage"
              :text="wrappedBookmarksCardMessage"
              :maxLines="1"
            />
          </template>
        </KCard>
      </KCardGrid>
    </div>
    <div>
      <div class="subheader">
        <div class="side-panel-subtitle">
          {{ selectFromChannels$() }}
        </div>
      </div>
      <p
        v-if="channels.length === 0"
        class="mt-24"
      >
        {{ noAvailableResources$() }}
      </p>
      <KCardGrid layout="1-1-1">
        <AccessibleChannelCard
          v-for="channel of channels"
          :key="channel.id"
          :contentNode="channel"
          :to="selectFromChannelsLink(channel)"
          :headingLevel="3"
        >
          <template #belowTitle>
            <KTextTruncator
              v-if="contentCardMessage(channel)"
              :text="contentCardMessage(channel)"
              :maxLines="1"
              style="margin-bottom: 8px"
            />
          </template>
        </AccessibleChannelCard>
      </KCardGrid>
    </div>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import AccessibleChannelCard from 'kolibri-common/components/Cards/AccessibleChannelCard.vue';
  import { PageNames } from '../../../../constants';
  import { SelectionTarget } from '../contants';
  import QuizResourceSelectionHeader from '../QuizResourceSelectionHeader.vue';

  /**
   * @typedef {import('../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectionIndex',
    components: {
      AccessibleChannelCard,
      QuizResourceSelectionHeader,
    },
    setup(props) {
      const { bookmarksFetch, channelsFetch } = props;
      const { count: bookmarksCount, data: bookmarksData } = bookmarksFetch;

      const { data: channels } = channelsFetch;

      const {
        selectFromChannels$,
        noAvailableResources$,
        numberOfBookmarks$,
        bookmarksLabel$,
        selectFromBookmarks$,
        searchLabel$,
      } = coreStrings;

      const wrappedBookmarksCardMessage = computed(() => {
        const propsMessage = props.bookmarksCardMessage(bookmarksData.value);
        if (propsMessage) {
          return propsMessage;
        }
        return numberOfBookmarks$({ count: bookmarksCount.value });
      });

      props.setTitle(props.defaultTitle);
      props.setGoBack(null);

      return {
        bookmarksCount,
        channels,
        SelectionTarget,
        selectFromChannels$,
        noAvailableResources$,
        wrappedBookmarksCardMessage,
        bookmarksLabel$,
        selectFromBookmarks$,
        searchLabel$,
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
       * Fetch object for fetching channels.
       * @type {FetchObject}
       */
      channelsFetch: {
        type: Object,
        required: true,
      },
      /**
       * Fetch object for fetching bookmarks.
       * @type {FetchObject}
       */
      bookmarksFetch: {
        type: Object,
        required: true,
      },
      /**
       * A function that takes an array of bookmarks and returns a string to describe them.
       */
      bookmarksCardMessage: {
        type: Function,
        default: () => {},
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
    },
    computed: {
      selectFromBookmarksLink() {
        if (this.target === SelectionTarget.LESSON) {
          return {
            name: PageNames.LESSON_SELECT_RESOURCES_BOOKMARKS,
          };
        }
        return {
          name: PageNames.QUIZ_SELECT_RESOURCES_BOOKMARKS,
        };
      },
    },
    beforeRouteEnter(_, __, next) {
      next(vm => {
        // Whenever we land here, we want to fetch the bookmarks again
        // in case the user has added or removed some within the side panel
        vm.bookmarksFetch.fetchData();
      });
    },
    methods: {
      selectFromChannelsLink(channel) {
        if (this.target === SelectionTarget.LESSON) {
          return {
            name: PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
            query: { topicId: channel.id },
          };
        }
        return {
          name: PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
          query: { topicId: channel.id },
        };
      },
      onSearchClick() {
        this.$router.push({
          name:
            this.target === SelectionTarget.LESSON
              ? PageNames.LESSON_SELECT_RESOURCES_SEARCH
              : PageNames.QUIZ_SELECT_RESOURCES_SEARCH,
        });
      },
    },
  };

</script>


<style scoped>

  .mt-24 {
    margin-top: 24px;
  }

  .side-panel-subtitle {
    font-size: 16px;
    font-weight: 600;
  }

  .subheader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .d-flex-end {
    display: flex;
    justify-content: flex-end;
  }

  .mb-24 {
    margin-bottom: 24px;
  }

</style>
