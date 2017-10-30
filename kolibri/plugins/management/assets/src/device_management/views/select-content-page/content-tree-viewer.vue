<template>

  <div>
    <div class="breadcrumbs">

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
          @clicktopic="goToTopic(node)"
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
  import contentNodeRow from './content-node-row';
  import { annotateNode } from './treeViewUtils';
  import { addNodeForTransfer, removeNodeForTransfer } from '../../state/actions/contentTransferActions';

  export default {
    name: 'contentTreeViewer',
    components: {
      contentNodeRow,
      kCheckbox,
    },
    computed: {
      annotatedChildNodes() {
        return this.childNodes.map(node => ({
          ...annotateNode(node, this.selectedNodes),
          path: [...this.topicNode.path, this.topicNode.id],
        }))
      },
      annotatedTopicNode() {
        return annotateNode(this.topicNode, this.selectedNodes);
      },
    },
    methods: {
      nodeIsChecked(node) {
        return node.checkboxType === 'checked';
      },
      nodeIsIndeterminate(node) {
        return node.checkboxType === 'indeterminate';
      },
      goToTopic(node) {
        console.log('yoyo', node);
      },
      toggleSelectAll() {
        this.toggleSelection(this.annotatedTopicNode);
      },
      toggleSelection(node) {
        if (this.nodeIsChecked(node)) {
          return this.removeNodeForTransfer(node);
        }
        return this.addNodeForTransfer(node);
      }
    },
    vuex: {
      getters: {
        childNodes: ({ pageState }) =>pageState.treeView.children,
        selectedNodes: ({ pageState }) =>pageState.selectedItems.nodes,
        topicNode: ({ pageState }) =>pageState.treeView.currentNode,
      },
      actions: {
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

</style>
