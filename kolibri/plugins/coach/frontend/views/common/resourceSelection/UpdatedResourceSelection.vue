<template>

  <div class="select-resource">
    <div>
      <ResourceSelectionBreadcrumbs
        v-if="topic && !hideBreadcrumbs"
        :ancestors="[...topic.ancestors, topic]"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <ContentCardList
        :contentList="contentList"
        :showSelectAll="showSelectAll"
        :isSelectAllDisabled="isSelectAllDisabled"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="selectAllChecked"
        :selectAllIndeterminate="selectAllIndeterminate"
        :contentIsChecked="contentIsChecked"
        :contentHasCheckbox="showCheckbox"
        :contentCheckboxDisabled="contentCheckboxDisabled"
        :contentCardLink="contentLink"
        :contentCardMessage="contentCardMessage"
        :showRadioButtons="!multi"
        :cardsHeadingLevel="cardsHeadingLevel"
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
  import { validateObject } from 'kolibri/utils/objectSpecs';
  import { ViewMoreButtonStates } from '../../../constants';
  import ContentCardList from './ContentCardList.vue';
  import ResourceSelectionBreadcrumbs from './ResourceSelectionBreadcrumbs.vue';

  export default {
    name: 'UpdatedResourceSelection',
    components: {
      ContentCardList,
      ResourceSelectionBreadcrumbs,
    },
    mixins: [commonCoreStrings],
    props: {
      /**
       * Boolean that determines if the select all checkbox should be rendered.
       */
      canSelectAll: {
        type: Boolean,
        default: false,
      },
      /**
       * Boolean that determines if the select checkboxes should be rendered.
       * This is different from `selectionRules` as `selectionRules` just determines
       * whether the checkbox is enabled or not.
       */
      isSelectable: {
        type: Boolean,
        default: true,
      },
      multi: {
        type: Boolean,
        default: true,
      },
      /**
       * Object representing the current topic. If present, it will render
       * the topic name, description and ancestor breadcrumbs.
       */
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
      /**
       * Array of functions that take a resource and return true if it should be selectable.
       */
      selectionRules: {
        type: Array,
        required: false,
        default: () => [],
        validator: rules =>
          validateObject(
            { rules },
            {
              rules: {
                type: Array,
                spec: {
                  type: Function,
                },
                default: () => [],
              },
            },
          ),
      },
      /**
       * Array of functions that take a list of selectable resources and
       * return true if select all should be enabled.
       */
      selectAllRules: {
        type: Array,
        required: false,
        default: () => [],
        validator: rules =>
          validateObject(
            { rules },
            {
              rules: {
                type: Array,
                spec: {
                  type: Function,
                },
                default: () => [],
              },
            },
          ),
      },
      selectedResources: {
        type: Array,
        required: true,
      },
      /**
       * Array of resource ids that already belongs to the target model (quiz/lessons),
       * and should not be selectable.
       */
      unselectableResourceIds: {
        type: Array,
        required: false,
        default: null,
      },
      /**
       * Route object for the channels page to be rendered in the breadcrumbs.
       * If null, the breadcrumbs will not render a link to the channels page.
       */
      channelsLink: {
        type: Object,
        required: false,
        default: null,
      },
      disabled: {
        type: Boolean,
        default: false,
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
      cardsHeadingLevel: {
        type: Number,
        default: 3,
      },
      getTopicLink: {
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
      hideBreadcrumbs: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
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
      isSelectAllDisabled() {
        if (this.disabled) {
          return true;
        }
        const deselectedResources = this.selectableContentList.filter(
          resource => !this.selectedResources.some(res => res.id === resource.id),
        );
        return !this.selectAllRules.every(rule => rule(deselectedResources));
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
        if (!content.is_leaf) {
          return this.topicsLink(content.id);
        }
        return this.getResourceLink(content.id);
      },
      topicsLink(topicId) {
        const route = this.getTopicLink?.(topicId);
        if (route) {
          return route;
        }

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
        if (this.disabled || this.unselectableResourceIds?.includes(resource.id)) {
          return true;
        }
        if (this.selectedResources.some(res => res.id === resource.id)) {
          return false;
        }
        return !this.selectionRules.every(rule => rule(resource) === true);
      },
      contentIsChecked(resource) {
        if (this.unselectableResourceIds?.includes(resource.id)) {
          return true;
        }
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
        return this.isSelectable && node.kind !== ContentNodeKinds.TOPIC;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
