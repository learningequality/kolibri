<template>

  <div>
    <div v-if="bookmarks.length > 0">
      <h2 class="side-panel-subtitle">
        {{ selectFromBookmarks$() }}
      </h2>
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
              {{ numberOfBookmarks$({ count: bookmarks.length }) }}
            </span>
          </template>
        </KCard>
      </KCardGrid>
    </div>
    <div>
      <div class="channels-header">
        <h2 class="side-panel-subtitle">
          {{ selectFromChannels$() }}
        </h2>
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
          :to="{}"
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

  export default {
    name: 'SelectionIndex',
    components: {
      AccessibleChannelCard,
    },
    setup() {
      const { bookmarks, channels } = injectResourceSelection();

      const {
        selectFromChannels$,
        numberOfBookmarks$,
        bookmarksLabel$,
        selectFromBookmarks$,
        searchLabel$,
      } = coreStrings;

      return {
        bookmarks,
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
        return { name: 'LESSON_SELECT_RESOURCES', params: { viewId: 'selectFromBookmarks' } };
      },
    },
  };

</script>


<style>

  .side-panel-subtitle {
    font-size: 16px;
  }

  .channels-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    margin-bottom: 16px;
  }

</style>
