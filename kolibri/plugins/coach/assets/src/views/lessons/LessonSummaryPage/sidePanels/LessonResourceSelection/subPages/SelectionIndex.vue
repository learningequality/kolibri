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
  import { injectResourceSelection } from '../useResourceSelection';
  import { PageNames } from '../../../../../../constants';
  import { ResourceSelectionView } from '../constants';

  export default {
    name: 'SelectionIndex',
    components: {
      AccessibleChannelCard,
    },
    setup() {
      const { bookmarksFetch, channelsFetch } = injectResourceSelection();
      const { additionalData } = bookmarksFetch;
      const { count: bookmarksCount } = additionalData.value;

      const { data: channels } = channelsFetch;

      const {
        selectFromChannels$,
        numberOfBookmarks$,
        bookmarksLabel$,
        selectFromBookmarks$,
        searchLabel$,
      } = coreStrings;

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
    computed: {
      selectFromBookmarksLink() {
        return {
          name: PageNames.LESSON_SELECT_RESOURCES,
          params: { viewId: ResourceSelectionView.SELECT_FROM_BOOKMARKS },
        };
      },
    },
    methods: {
      selectFromChannelsLink(channel) {
        return {
          name: PageNames.LESSON_SELECT_RESOURCES,
          params: { viewId: ResourceSelectionView.SELECT_FROM_CHANNELS },
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
