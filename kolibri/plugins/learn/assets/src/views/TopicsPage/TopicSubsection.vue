<template>

  <div>
    <!-- header link to folder -->
    <h2>
      <KRouterLink
        :text="topic.title"
        :to="genContentLink(topic)"
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
      currentCardViewStyle="card"
      :gridType="2"
      @toggleInfoPanel="$emit('toggleInfoPanel', $event)"
    />
    <KButton
      v-if="topic.showMore"
      class="more-after-grid"
      data-test="more-button"
      appearance="basic-link"
      @click="$emit('showMore', topic.id)"
    >
      {{ $tr('showMore') }}
    </KButton>
    <KRouterLink v-else-if="topic.viewAll" class="more-after-grid" :to="topic.viewAll">
      {{ $tr('viewAll') }}
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import genContentLink from '../../utils/genContentLink';
  import LibraryAndChannelBrowserMainContent from '../LibraryAndChannelBrowserMainContent';

  export default {
    name: 'TopicSubsection',
    components: { LibraryAndChannelBrowserMainContent },
    mixins: [commonCoreStrings],
    props: {
      topic: {
        type: Object,
        required: true,
      },
      subTopicLoading: {
        type: Boolean,
        default: false,
        required: false,
      },
    },
    data() {
      return {};
    },
    methods: {
      genContentLink(topic) {
        return genContentLink(topic.id, this.topicId, topic.is_leaf, this.backRoute, {
          ...this.context,
          ...this.$route.query,
        });
      },
    },
    $trs: {
      showMore: {
        message: 'Show more',
        context: 'Clickable link which allows to load more resources.',
      },
      viewAll: {
        message: 'View all',
        context: 'Clickable link which allows to display all resources in a topic.',
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
