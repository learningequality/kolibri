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
          :checked="selectAllIsChecked"
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
          @selecttopic="goToTopic(node)"
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
  import { annotateNodes } from './treeViewUtils';
  import { addNodeForTransfer, removeNodeForTransfer } from '../../state/actions/contentTransferActions';

  export default {
    name: 'contentTreeViewer',
    components: {
      contentNodeRow,
      kCheckbox,
    },
    computed: {
      annotatedChildNodes() {
        return annotateNodes(this.childNodes, this.selectedNodes);
      },
      annotatedTopicNode() {
        return annotateNodes([this.topicNode], this.selectedNodes)[0];
      },
      selectAllIsChecked() {
        return this.annotatedTopicNode.checkboxType === 'checked';
      },
    },
    methods: {
      nodeIsChecked(node) {
        return node.checkboxType === 'checked';
      },
      nodeIsIndeterminate(node) {
        return node.checkboxType === 'indeterminate';
      },
      goToTopic(topicNode) {
        console.log('yoyo', topicNode);
      },
      toggleSelectAll() {
        if (this.selectAllIsChecked) {
          return this.removeNodeForTransfer(this.topicNode);
        }
        return this.addNodeForTransfer(this.topicNode);
      }
    },
    vuex: {
      getters: {
        childNodes: state => state.pageState.treeView.children,
        selectedNodes: state => state.pageState.selectedItems.nodes,
        topicNode: state => state.pageState.treeView.currentNode,
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
