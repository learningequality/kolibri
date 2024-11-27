<template>

  <div class="select-resource">
    <div>
      <ResourceSelectionBreadcrumbs
        v-if="topic"
        :ancestors="[...topic.ancestors, topic]"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <ContentCardList
        :contentList="contentList"
        :showSelectAll="canSelectAll"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="selectAllChecked"
        :selectAllIndeterminate="selectAllIndeterminate"
        :contentIsChecked="contentIsChecked"
        :contentIsIndeterminate="contentIsIndeterminate"
        :contentHasCheckbox="showCheckbox"
        :contentCheckboxDisabled="contentCheckboxDisabled"
        :contentCardLink="contentLink"
        :loadingMoreState="loadingMore"
        :showRadioButtons="!multi"
        @changeselectall="handleSelectAll"
        @change_content_card="toggleSelected"
        @moreresults="fetchMoreResources"
      />
    </div>
  </div>

</template>


<script>

  import { computed } from '@vue/composition-api';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { ContentNodeKinds } from 'kolibri/constants';
  import { ViewMoreButtonStates } from '../../../constants/index';
  import ContentCardList from '../../lessons/LessonResourceSelectionPage/ContentCardList.vue';
  import ResourceSelectionBreadcrumbs from '../../lessons/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';
  import { injectResourceSelection } from './sidePanels/LessonResourceSelection/useResourceSelection';

  const ContentSource = {
    BOOKMARKS: 'bookmarks',
    TOPIC_TREE: 'topicTree',
    SEARCH: 'search',
  };

  export default {
    name: 'UpdatedResourceSelection',
    components: {
      ContentCardList,
      ResourceSelectionBreadcrumbs,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const loadingMore = computed(() => false);

      const {
        topic,
        bookmarks,
        selectionRules = [],
        selectedResources,
        selectResources,
        deselectResources,
      } = injectResourceSelection();

      const contentList = computed(() => {
        const contentSources = {
          [ContentSource.BOOKMARKS]: bookmarks.value,
        };

        return contentSources[props.source] || [];
      });

      // TODO let's not use text for this
      const viewMoreButtonState = computed(() => {
        return ViewMoreButtonStates.NO_MORE;
      });

      function fetchMoreResources() {
        return [];
      }

      return {
        topic,
        loadingMore,
        contentList,
        selectionRules,
        selectedResources,
        fetchMoreResources,
        viewMoreButtonState,
        selectResources,
        deselectResources,
      };
    },
    props: {
      canSelectAll: {
        type: Boolean,
        default: false,
      },
      multi: {
        type: Boolean,
        default: true,
      },
      source: {
        type: String,
        required: true,
        validator(value) {
          return Object.values(ContentSource).includes(value);
        },
      },
    },
    computed: {
      channelsLink() {
        return {
          name: this.$route.name,
          params: {
            ...this.$route.params,
            topic_id: null,
          },
        };
      },
      selectAllIndeterminate() {
        return false;
      },
      selectAllChecked() {
        return false;
      },
    },
    methods: {
      contentLink(content) {
        const { name, params, query } = this.$route;
        if (!content.is_leaf) {
          // Link folders to their page
          return {
            name,
            query: {
              ...query,
              topic_id: content.id,
            },
          };
        }
        // Just return the current route; router-link will handle the no-op from here
        return { name, params, query };
      },
      topicsLink(topic_id) {
        return this.contentLink({ id: topic_id });
      },
      handleSelectAll() {
        return 'select all';
      },
      contentCheckboxDisabled() {
        return false;
      },
      contentIsChecked(resource) {
        return this.selectedResources.find(res => res.id === resource.id);
      },
      contentIsIndeterminate(resource) {
        return !resource;
      },
      toggleSelected({ content, checked }) {
        if (checked) {
          this.selectResources([content]);
        } else {
          this.deselectResources([content]);
        }
      },
      showCheckbox(node) {
        return node.kind !== ContentNodeKinds.TOPIC;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .select-resource {
    padding-bottom: 6em;
  }

  .title-style {
    font-size: 1.4em;
    font-weight: 600;
  }

  .bookmark-container {
    display: flex;
    min-height: 141px;
    margin-bottom: 24px;
    border-radius: 2px;
    box-shadow:
      0 1px 5px 0 #a1a1a1,
      0 2px 2px 0 #e6e6e6,
      0 3px 1px -2px #ffffff;
    transition: box-shadow 0.25s ease;
  }

  .mobile-bookmark-container {
    @extend %dropshadow-2dp;

    display: flex;
    max-width: 100%;
    min-height: 141px;
    margin: auto;
    margin-bottom: 24px;
    border-radius: 2px;

    .ease:hover {
      @extend %dropshadow-6dp;
      @extend %md-decelerate-func;

      transition: all $core-time;
    }
  }

  .mobile-bookmark-icon {
    left: 24px !important;
  }

  .mobile-text {
    margin-top: 20px;
    margin-left: 60px;
  }

  .bookmark-container:hover {
    box-shadow:
      0 5px 5px -3px #a1a1a1,
      0 8px 10px 1px #d1d1d1,
      0 3px 14px 2px #d4d4d4;
  }

  .text {
    margin-left: 15rem;
  }

  .bottom-navigation {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 1em;
    line-height: 2.5em;
    text-align: center;
    background-color: white;
    border-top: 1px solid black;
  }

  .select-folder-style {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }

  .align-select-folder-style {
    margin-top: 2em;
  }

  .shadow {
    box-shadow:
      0 1px 3px 0 rgba(0, 0, 0, 0.2),
      0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 2px 1px -1px rgba(0, 0, 0, 0.12);
  }

  // Force the leaf nodes not to look like a link
  /deep/ .is-leaf.content-card {
    cursor: default;
    box-shadow:
      0 1px 5px 0 #a1a1a1,
      0 2px 2px 0 #e6e6e6,
      0 3px 1px -2px #ffffff;
  }

  .number-question {
    display: inline-flex;
  }

  .group-button-border {
    display: inline-flex;
    align-items: center;
    height: 3.5em;
    border: 1px solid;
  }

  .divider {
    display: block;
    min-width: 100%;
    height: 1px;
    margin: 24px 0;
    overflow-y: hidden;
  }

</style>
