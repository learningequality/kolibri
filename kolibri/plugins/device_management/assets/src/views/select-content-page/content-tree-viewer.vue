<template>

  <section class="content-tree-viewer">
    <div class="breadcrumbs">
      <k-breadcrumbs
        :items="breadcrumbs"
        :showSingleItem="true"
      />
    </div>

    <div
      v-if="annotatedChildNodes.length > 0"
      class="contents"
    >
      <core-table>
        <thead slot="thead">
          <tr>
            <th class="core-table-checkbox-col select-all">
              <k-checkbox
                :label="$tr('selectAll')"
                :checked="nodeIsChecked(annotatedTopicNode)"
                :disabled="disableAll || annotatedTopicNode.disabled"
                @change="toggleSelectAll"
              />
            </th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <content-node-row
            v-for="node in annotatedChildNodes"
            v-if="showNode(node)"
            :checked="nodeIsChecked(node)"
            :disabled="disableAll || node.disabled"
            :indeterminate="nodeIsIndeterminate(node)"
            :key="node.id"
            :message="node.message"
            :node="node"
            @clicktopic="updateCurrentTopicNode(node)"
            @changeselection="toggleSelection(node)"
          />
        </tbody>
      </core-table>
    </div>

    <div
      v-else
      class="no-contents"
    >
      {{ $tr('topicHasNoContents') }}
    </div>
  </section>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.coreTable';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import last from 'lodash/last';
  import every from 'lodash/every';
  import omit from 'lodash/omit';
  import { wizardState, inExportMode } from '../../state/getters';
  import {
    addNodeForTransfer,
    removeNodeForTransfer,
  } from '../../state/actions/contentTreeViewerActions';
  import { navigateToTopicUrl } from '../../wizardTransitionRoutes';
  import { TransferTypes } from '../../constants';
  import { annotateNode, CheckboxTypes, transformBreadrumb } from './treeViewUtils';
  import contentNodeRow from './content-node-row';

  // Removes annotations (except path) added to nodes in ContentTreeViewer before putting in store.
  function sanitizeNode(node) {
    return omit(node, ['message', 'checkboxType', 'disabled', 'children']);
  }

  export default {
    name: 'contentTreeViewer',
    components: {
      contentNodeRow,
      kBreadcrumbs,
      kCheckbox,
      CoreTable,
    },
    data() {
      return {
        disableAll: false,
      };
    },
    computed: {
      childNodesWithPath() {
        return this.childNodes.map(node => ({
          ...node,
          path: [
            ...this.path,
            {
              id: node.id,
              title: node.title,
            },
          ],
        }));
      },
      annotatedChildNodes() {
        return this.childNodesWithPath.map(n =>
          annotateNode(n, this.nodesForTransfer, !this.inExportMode)
        );
      },
      annotatedTopicNode() {
        // For the purposes of annotating the parent topic node, we need to add
        // the disabled child nodes to the "include" list. So if all the non-disabled
        // nodes are selected, then the parent topic's checkbox will be checked.
        const selections = {
          included: [
            ...this.nodesForTransfer.included,
            ...this.annotatedChildNodes.filter(n => n.disabled),
          ],
          omitted: [...this.nodesForTransfer.omitted],
        };
        return annotateNode(
          { ...this.topicNode, path: [...this.path] },
          selections,
          !this.inExportMode
        );
      },
      breadcrumbItems() {
        const items = [...this.breadcrumbs];
        delete last(items).link;
        return items;
      },
    },
    methods: {
      nodeIsChecked(node) {
        return node.checkboxType === CheckboxTypes.CHECKED;
      },
      nodeIsIndeterminate(node) {
        return node.checkboxType === CheckboxTypes.INDETERMINATE;
      },
      nodeCompletesParent(node) {
        // Get sibling nodes and check if every one is either checked or disabled
        const siblings = this.annotatedChildNodes.filter(({ id }) => id !== node.id);
        return every(siblings, node => this.nodeIsChecked(node) || node.disabled);
      },
      showNode(node) {
        if (this.transferType === TransferTypes.LOCALEXPORT) {
          return node.available;
        }
        // If there are no resources at all within the node, do not display at all
        return node.importable && node.total_resources;
      },
      updateCurrentTopicNode(node) {
        return navigateToTopicUrl.call(this, node);
      },
      toggleSelectAll() {
        this.toggleSelection(this.annotatedTopicNode);
      },
      toggleSelection(node) {
        // When the clicked node would put the parent at 100% included,
        // add the parent (as a side effect, all the children are removed from "include").
        this.disableAll = true;
        let promise;
        if (this.nodeIsChecked(node)) {
          promise = this.removeNodeForTransfer(sanitizeNode(node));
        } else {
          if (this.nodeCompletesParent(node)) {
            promise = this.addNodeForTransfer(sanitizeNode(this.annotatedTopicNode));
          } else {
            promise = this.addNodeForTransfer(sanitizeNode(node));
          }
        }
        return promise.then(() => {
          this.disableAll = false;
          this.$forceUpdate();
        });
      },
    },
    vuex: {
      getters: {
        breadcrumbs: state => wizardState(state).path.map(transformBreadrumb),
        childNodes: state => wizardState(state).currentTopicNode.children,
        inExportMode,
        path: state => wizardState(state).path,
        nodesForTransfer: state => wizardState(state).nodesForTransfer,
        topicNode: state => wizardState(state).currentTopicNode,
        transferType: state => wizardState(state).transferType,
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

  .select-all
    white-space: nowrap
    .k-checkbox-container
      margin-right: -70px

</style>
