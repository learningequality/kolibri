<template>

  <div>
    <div v-if="bookmarksCount > 0">
      <div class="mb-16 side-panel-subtitle">
        {{ selectFromBookmarks$() }}
      </div>
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
            <span>
              {{ numberOfBookmarks$({ count: bookmarksCount }) }}
            </span>
          </template>
        </KCard>
      </KCardGrid>
    </div>
    <div>
      <div class="channels-header">
        <div class="side-panel-subtitle">
          {{ selectFromChannels$() }}
        </div>
        <KButton
          icon="filter"
          :text="searchLabel$()"
        />
      </div>
      <KCardGrid layout="1-1-1">
        <AccessibleChannelCard
          v-for="channel of channels"
          :key="channel.id"
          :contentNode="channel"
          :to="selectFromChannelsLink(channel)"
          :headingLevel="3"
        />
      </KCardGrid>
    </div>
  </div>

</template>


<script>

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import AccessibleChannelCard from 'kolibri-common/components/Cards/AccessibleChannelCard.vue';
  import { PageNames } from '../../../../../../constants';
  import { coachStrings } from '../../../../../common/commonCoachStrings';

  /**
   * @typedef {import('../../../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectionIndex',
    components: {
      AccessibleChannelCard,
    },
    setup(props) {
      const { bookmarksFetch, channelsFetch } = props;
      const { count: bookmarksCount } = bookmarksFetch;

      const { data: channels } = channelsFetch;

      const {
        selectFromChannels$,
        numberOfBookmarks$,
        bookmarksLabel$,
        selectFromBookmarks$,
        searchLabel$,
      } = coreStrings;

      const { manageLessonResourcesTitle$ } = coachStrings;

      props.setTitle(manageLessonResourcesTitle$());
      props.setGoBack(null);

      return {
        bookmarksCount,
        channels,
        selectFromChannels$,
        numberOfBookmarks$,
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
    },
    computed: {
      selectFromBookmarksLink() {
        return {
          name: PageNames.LESSON_SELECT_RESOURCES_BOOKMARKS,
        };
      },
    },
    methods: {
      selectFromChannelsLink(channel) {
        return {
          name: PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
          query: { topicId: channel.id },
        };
      },
    },
  };

</script>


<style scoped>

  .mb-16 {
    margin-bottom: 16px;
  }

  .side-panel-subtitle {
    font-size: 16px;
    font-weight: 600;
  }

  .channels-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    margin-bottom: 16px;
  }

</style>
