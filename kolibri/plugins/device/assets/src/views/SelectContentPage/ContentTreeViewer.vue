<template>

  <section class="content-tree-viewer">
    <div class="breadcrumbs">
      <KBreadcrumbs
        :items="breadcrumbs"
        :showSingleItem="true"
      />
    </div>

    <div
      v-if="annotatedChildNodes.length > 0"
      class="contents"
    >
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th class="core-table-checkbox-col select-all">
              <KCheckbox
                :label="$tr('selectAll')"
                :checked="nodeIsChecked(annotatedTopicNode)"
                :disabled="disableSelectAll"
                @change="toggleSelectAll"
              />
            </th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <ContentNodeRow
            v-for="cNode in showableAnnotatedChildNodes"
            :key="cNode.id"
            :checked="nodeIsChecked(cNode)"
            :disabled="disabled || disableAll || cNode.disabled"
            :indeterminate="nodeIsIndeterminate(cNode)"
            :message="cNode.message"
            :node="cNode"
            :getLinkObject="topicLinkObject"
            @changeselection="toggleSelection(cNode)"
          />
        </transition-group>
      </CoreTable>
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

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import every from 'lodash/every';
  import omit from 'lodash/omit';
  import { TransferTypes } from '../../constants';
  import { selectContentTopicLink } from '../ManageContentPage/manageContentLinks';
  import { annotateNode, CheckboxTypes, transformBreadrumb } from './treeViewUtils';
  import ContentNodeRow from './ContentNodeRow';

  // Removes annotations (except path) added to nodes in ContentTreeViewer before putting in store.
  function sanitizeNode(node) {
    return omit(node, ['message', 'checkboxType', 'disabled', 'children']);
  }

  export default {
    name: 'ContentTreeViewer',
    components: {
      ContentNodeRow,
      CoreTable,
    },
    props: {
      node: {
        type: Object,
        required: false,
      },
      manageMode: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        disableAll: false,
      };
    },
    computed: {
      ...mapState('manageContent/wizard', ['nodesForTransfer']),
      currentTopicNode() {
        if (this.node) {
          return this.node;
        } else {
          return this.$store.state.manageContent.wizard.currentTopicNode;
        }
      },
      transferType() {
        if (this.manageMode) {
          return TransferTypes.LOCALEXPORT;
        } else {
          return this.$store.state.manageContent.wizard.transferType;
        }
      },
      path() {
        if (this.manageMode) {
          return [...this.node.ancestors, this.node];
        } else {
          return this.$store.state.manageContent.wizard.path;
        }
      },
      breadcrumbs() {
        if (this.manageMode) {
          return this.path.map(x => {
            let query = {};
            if (x.id !== this.$route.params.channel_id) {
              query.node = x.id;
            }
            return {
              text: x.title,
              link: { query },
            };
          });
        } else {
          return this.path.map(x => transformBreadrumb(x, this.$route));
        }
      },
      childNodes() {
        // Guard against when state is reset going back to manage resources page
        return this.currentTopicNode.children || [];
      },
      noSelectableNodes() {
        // If importing from an external drive, disable select-all if every child node is
        // 1) a leaf node AND
        // 2a) not importable from the drive OR
        // 2b) already on the server
        // TODO check to see if this logic is valid for PEER_IMPORT as well.
        if (this.transferType === TransferTypes.LOCALIMPORT) {
          return every(this.annotatedChildNodes, node => {
            return (
              node.kind !== ContentNodeKinds.TOPIC &&
              (!node.importable || node.on_device_resources > 0)
            );
          });
        } else {
          return false;
        }
      },
      disableSelectAll() {
        return (
          this.disabled ||
          this.disableAll ||
          this.annotatedTopicNode.disabled ||
          this.noSelectableNodes
        );
      },
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
          annotateNode(n, this.nodesForTransfer, !this.manageMode)
        );
      },
      showableAnnotatedChildNodes() {
        return this.annotatedChildNodes.filter(this.showNode);
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
          { ...this.currentTopicNode, path: [...this.path] },
          selections,
          !this.manageMode
        );
      },
    },
    methods: {
      ...mapActions('manageContent/wizard', ['addNodeForTransfer', 'removeNodeForTransfer']),
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
      topicLinkObject(node) {
        if (this.manageMode) {
          return {
            query: {
              node: node.id,
            },
          };
        } else {
          return selectContentTopicLink(node, this.$route.query, this.$route.params.channel_id);
        }
      },
    },
    $trs: {
      selectAll: 'Select all',
      topicHasNoContents: 'This topic has no sub-topics or resources',
    },
  };

</script>


<style lang="scss" scoped>

  .select-all {
    // Overrides overflow-x: hidden rule for CoreTable th's
    overflow-x: visible;
    white-space: nowrap;
    .k-checkbox-container {
      margin-right: -70px;
    }
  }

  .list-enter-active {
    transition: opacity 0.5s;
  }

  // Make old rows disappear immediately
  .list-leave-active {
    display: none;
  }

  .list-enter {
    opacity: 0;
  }

</style>
