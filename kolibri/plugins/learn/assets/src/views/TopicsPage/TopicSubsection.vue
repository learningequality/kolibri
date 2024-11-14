<template>

  <div>
    <!-- header link to folder -->
    <h2>
      <template v-for="prefixTitle in topic.prefixTitles || []">
        <span
          :key="prefixTitle"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ prefixTitle }}
        </span>
        <KIcon
          :key="topic.title + prefixTitle"
          icon="chevronRight"
          :color="$themeTokens.annotation"
          :style="{ top: '4px' }"
        />
      </template>
      <KRouterLink
        :text="topic.title"
        :to="genContentLinkKeepCurrentBackLink(topic.id, false)"
        class="folder-header-link"
        :appearanceOverrides="{ color: $themeTokens.text }"
      >
        <template #iconAfter>
          <KIcon
            icon="chevronRight"
            :style="{ top: '4px' }"
          />
        </template>
      </KRouterLink>
    </h2>
    <!-- card grid of items in folder -->
    <LibraryAndChannelBrowserMainContent
      v-if="topic.children && topic.children.length"
      data-test="children-cards-grid"
      :contents="topic.children"
      :gridType="gridType"
      :allowDownloads="allowDownloads"
      currentCardViewStyle="card"
      :keepCurrentBackLink="true"
      @toggleInfoPanel="$emit('toggleInfoPanel', $event)"
    />
    <KButton
      v-if="topic.showMore"
      class="more-after-grid"
      data-test="more-button"
      appearance="basic-link"
      @click="$emit('showMore', topic.id)"
    >
      {{ coreString('showMoreAction') }}
    </KButton>
    <KRouterLink
      v-else-if="topic.viewAll"
      class="more-after-grid"
      :to="topic.viewAll"
    >
      {{ coreString('viewAll') }}
    </KRouterLink>
    <KButton
      v-else-if="topic.viewMore && topic.id !== subTopicLoading"
      class="more-after-grid"
      appearance="basic-link"
      @click="$emit('loadMoreInSubtopic', topic.id)"
    >
      {{ coreString('viewMoreAction') }}
    </KButton>

    <KCircularLoader v-if="topic.id === subTopicLoading" />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useContentLink from '../../composables/useContentLink';
  import LibraryAndChannelBrowserMainContent from '../LibraryAndChannelBrowserMainContent';

  export default {
    name: 'TopicSubsection',
    components: { LibraryAndChannelBrowserMainContent },
    mixins: [commonCoreStrings],
    setup() {
      const { genContentLinkKeepCurrentBackLink } = useContentLink();
      return { genContentLinkKeepCurrentBackLink };
    },
    props: {
      allowDownloads: {
        type: Boolean,
        default: false,
      },
      topic: {
        type: Object,
        required: true,
      },
      subTopicLoading: {
        type: Boolean,
        default: false,
        required: false,
      },
      gridType: {
        type: Number,
        default: 1,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .folder-header-link {
    /deep/ .link-text {
      text-decoration: none !important;
    }
  }

  .more-after-grid {
    margin-bottom: 16px;
  }

</style>
