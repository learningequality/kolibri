<template>

  <div>
    <div class="breadcrumbs">
      <k-breadcrumbs
        :items="breadcrumbs"
        :showAllCrumbs="true"
      />
    </div>

    <div
      v-if="annotatedChildNodes.length > 0"
      class="contents"
    >
      <div class="select-all">
        <k-checkbox
          :label="$tr('selectAll')"
          :checked="nodeIsChecked(annotatedTopicNode)"
          @change="toggleSelectAll"
        />
      </div>

      <div class="content-node-rows">
        <content-node-row
          v-for="node in annotatedChildNodes"
          :key="node.id"
          :checked="nodeIsChecked(node)"
          :indeterminate="nodeIsIndeterminate(node)"
          :disabled="node.disabled"
          :message="node.message"
          :node="node"
          @clicktopic="updateTopic(node)"
          @changeselection="toggleSelection(node)"
        />
      </div>
    </div>
    <div
      v-else
      class="no-contents"
    >
      {{ $tr('topicHasNoContents') }}
    </div>

  </div>

</template>


<script>

  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import contentNodeRow from './content-node-row';
  import { annotateNode, transformBreadrumb } from './treeViewUtils';
  import {
    addNodeForTransfer,
    removeNodeForTransfer,
    updateTreeViewTopic,
  } from '../../state/actions/contentTransferActions';
  import { wizardState } from '../../state/getters';
  import last from 'lodash/last';
  import every from 'lodash/every';

  export default {
    name: 'contentTreeViewer',
    components: {
      contentNodeRow,
      kBreadcrumbs,
      kCheckbox,
    },
    computed: {
      childNodesWithPath() {
        return this.childNodes.map(node => ({
          ...node,
          path: [...this.path, this.topicNode.pk],
        }));
      },
      annotatedChildNodes() {
        return this.childNodesWithPath.map(n => annotateNode(n, this.selectedNodes));
      },
      annotatedTopicNode() {
        // need to include disabled
        const selectedOrDisabled = {
          include: [
            ...this.selectedNodes.include,
            ...this.annotatedChildNodes.filter(n => n.disabled),
          ],
          omit: [...this.selectedNodes.omit],
        };
        return annotateNode({ ...this.topicNode, path: [...this.path] }, selectedOrDisabled);
      },
      breadcrumbItems() {
        const items = [...this.breadcrumbs];
        delete last(items).link;
        return items;
      },
    },
    methods: {
      nodeIsChecked(node) {
        return node.checkboxType === 'checked';
      },
      nodeIsIndeterminate(node) {
        return node.checkboxType === 'indeterminate';
      },
      nodeCompletesParent(node) {
        // get sibling nodes and check if every one is either checked or disabled
        const siblings = this.annotatedChildNodes.filter(({ pk }) => pk !== node.pk);
        return every(siblings, node => this.nodeIsChecked(node) || node.disabled);
      },
      updateTopic(node) {
        // return this.updateTreeViewTopic(node);
        this.$router.replace({
          name: 'treeview_update_topic',
          query: {
            topic: node.pk,
          },
          params: {
            pk: node.pk,
            title: node.title,
            replaceCrumbs: false,
          },
        });
      },
      toggleSelectAll() {
        this.toggleSelection(this.annotatedTopicNode);
      },
      toggleSelection(node) {
        if (this.nodeIsChecked(node)) {
          return this.removeNodeForTransfer(node);
        }
        // if the clicked node would put the parent at 100% included
        if (this.nodeCompletesParent(node)) {
          return this.addNodeForTransfer({ ...this.annotatedTopicNode });
        }
        return this.addNodeForTransfer(node);
      },
    },
    vuex: {
      getters: {
        breadcrumbs: state => wizardState(state).treeView.breadcrumbs.map(transformBreadrumb),
        childNodes: state => wizardState(state).treeView.currentNode.children,
        selectedNodes: state => wizardState(state).selectedItems.nodes,
        topicNode: state => wizardState(state).treeView.currentNode,
        path: state => wizardState(state).path,
      },
      actions: {
        updateTreeViewTopic,
        addNodeForTransfer,
        removeNodeForTransfer,
      },
    },
    $trs: {
      selectAll: 'Select all',
      topicHasNoContents: 'This topic has no sub-topics or resources',
    },
  };

</script>


<style lang="stylus" scoped>

  .select-all
    .k-checkbox-container
      margin-top: 0
      margin-bottom: 0

</style>
