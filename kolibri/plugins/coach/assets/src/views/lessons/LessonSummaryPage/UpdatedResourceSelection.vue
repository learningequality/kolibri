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
        :showSelectAll="showSelectAll"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="selectAllChecked"
        :selectAllIndeterminate="selectAllIndeterminate"
        :contentIsChecked="contentIsChecked"
        :contentIsIndeterminate="contentIsIndeterminate"
        :contentHasCheckbox="showCheckbox"
        :contentCheckboxDisabled="contentCheckboxDisabled"
        :contentCardLink="contentLink"
        :showRadioButtons="!multi"
        @changeselectall="handleSelectAll"
        @change_content_card="toggleSelected"
        @moreresults="fetchMore"
      />
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { ContentNodeKinds } from 'kolibri/constants';
  import ContentCardList from '../../lessons/LessonResourceSelectionPage/ContentCardList.vue';
  import ResourceSelectionBreadcrumbs from '../../lessons/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';
  import { PageNames } from '../../../constants';

  export default {
    name: 'UpdatedResourceSelection',
    components: {
      ContentCardList,
      ResourceSelectionBreadcrumbs,
    },
    mixins: [commonCoreStrings],
    props: {
      canSelectAll: {
        type: Boolean,
        default: false,
      },
      multi: {
        type: Boolean,
        default: true,
      },
      topic: {
        type: Object,
        required: true,
      },
      contentList: {
        type: Array,
        required: true,
      },
      viewMoreButtonState: {
        type: String,
        required: false,
        default: null,
      },
      fetchMore: {
        type: Function,
        required: false,
        default: null,
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
    },
    computed: {
      channelsLink() {
        return {
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        };
      },
      selectAllIndeterminate() {
        return (
          !this.selectAllChecked &&
          this.selectableContentList.some(resource =>
            this.selectedResources.some(selectedResource => selectedResource.id === resource.id),
          )
        );
      },
      selectAllChecked() {
        return this.selectableContentList.every(resource =>
          this.selectedResources.some(selectedResource => selectedResource.id === resource.id),
        );
      },
      selectableContentList() {
        return this.contentList.filter(
          content => this.showCheckbox(content) && !this.contentCheckboxDisabled(content),
        );
      },
      showSelectAll() {
        return this.canSelectAll && this.multi && this.selectableContentList.length > 0;
      },
    },
    methods: {
      contentLink(content) {
        const { name, params, query } = this.$route;
        if (!content.is_leaf) {
          return this.topicsLink(content.id);
        }
        // Just return the current route; router-link will handle the no-op from here
        return { name, params, query };
      },
      topicsLink(topicId) {
        const { name, params, query } = this.$route;
        return {
          name,
          params: params,
          query: {
            ...query,
            topicId,
          },
        };
      },
      handleSelectAll(checked) {
        if (checked) {
          this.$emit('selectResources', this.selectableContentList);
        } else {
          this.$emit('deselectResources', this.selectableContentList);
        }
      },
      contentCheckboxDisabled(resource) {
        return !this.selectionRules.every(rule => rule(resource) === true);
      },
      contentIsChecked(resource) {
        return this.selectedResources.some(res => res.id === resource.id);
      },
      contentIsIndeterminate(resource) {
        return !resource;
      },
      toggleSelected({ content, checked }) {
        if (!this.multi) {
          return this.$emit('setSelectedResources', checked ? [content] : []);
        }
        if (checked) {
          this.$emit('selectResources', [content]);
        } else {
          this.$emit('deselectResources', [content]);
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
