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
  import { PageNames, ViewMoreButtonStates } from '../../../constants';

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
        required: false,
        default: null,
      },
      contentList: {
        type: Array,
        required: true,
      },
      hasMore: {
        type: Boolean,
        default: false,
      },
      fetchMore: {
        type: Function,
        required: false,
        default: null,
      },
      loadingMore: {
        type: Boolean,
        default: false,
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
      viewMoreButtonState() {
        if (this.loadingMore) {
          return ViewMoreButtonStates.LOADING;
        }
        if (this.hasMore) {
          return ViewMoreButtonStates.HAS_MORE;
        }
        return ViewMoreButtonStates.NO_MORE;
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


<style lang="scss" scoped></style>
