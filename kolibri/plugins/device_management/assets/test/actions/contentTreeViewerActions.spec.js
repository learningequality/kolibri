//
import omit from 'lodash/fp/omit';
import { jestMockResource } from 'testUtils'; // eslint-disable-line
import { TaskResource } from 'kolibri.resources';
import { makeNode, contentNodeGranularPayload, defaultChannel, dupedChannel } from '../utils/data';
import { updateTreeViewTopic } from '../../src/modules/wizard/handlers';
import ContentNodeGranularResource from '../../src/apiResources/contentNodeGranular';
import ChannelResource from '../../src/apiResources/deviceChannel';
import { makeSelectContentPageStore } from '../utils/makeStore';

const simplePath = (...ids) => ids.map(id => ({ id, title: `node_${id}` }));

jestMockResource(ChannelResource);
jestMockResource(ContentNodeGranularResource);
jestMockResource(TaskResource);

const ADD_NODE_ACTION = 'manageContent/wizard/addNodeForTransfer';
const REMOVE_NODE_ACTION = 'manageContent/wizard/removeNodeForTransfer';

describe('contentTreeViewer actions', () => {
  let store;

  function assertIncludeEquals(expected) {
    // HACK add the hard-coded file sizes to the expected array
    expect(store.state.manageContent.wizard.nodesForTransfer.included).toEqual(
      expected.map(addFileSizes)
    );
  }

  function assertOmitEquals(expected) {
    expect(store.state.manageContent.wizard.nodesForTransfer.omitted).toEqual(
      expected.map(addFileSizes)
    );
  }

  function assertFilesResourcesEqual(
    expectedFiles,
    expectedResources,
    transferType = 'remoteimport'
  ) {
    const { fileSize, resources } = store.getters['manageContent/wizard/nodeTransferCounts'](
      transferType
    );
    expect(fileSize).toEqual(expectedFiles);
    expect(resources).toEqual(expectedResources);
  }

  function setIncludedNodes(nodes) {
    store.state.manageContent.wizard.nodesForTransfer.included = nodes.map(addFileSizes);
  }

  function setOmittedNodes(nodes) {
    store.state.manageContent.wizard.nodesForTransfer.omitted = nodes.map(addFileSizes);
  }

  beforeEach(() => {
    store = makeSelectContentPageStore();
  });

  function addFileSizes(node) {
    return {
      ...node,
      importable_file_size: 1,
      on_device_file_size: 0,
    };
  }

  /**
   * Notes:
   * `makeNode` gives each Node a resource and file count of 1 by default,
   * with 0 file/resources on the device, so the asserted file sizes may be unrealistic
   *
   */
  describe('addNodeForTransfer action', () => {
    describe('adding a single Node to empty list', () => {
      // ...straightforwardly adds it to `include`
      const node_1 = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        importable_resources: 200,
        on_device_resources: 50,
      });
      beforeEach(() => {
        return store.dispatch(ADD_NODE_ACTION, node_1);
      });
      it('should include the added node', () => {
        assertIncludeEquals([node_1]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[1, 200, 'remoteimport'], [0, 50, 'localexport'], [1, 200, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('adding Nodes that are not parent/child to each other', () => {
      // ...straightforwardly adds both to `include`
      const node_1 = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        importable_resources: 200,
        on_device_resources: 50,
      });
      const node_2 = makeNode('2_2_1', {
        path: simplePath('2', '2_2'),
        importable_resources: 200,
        on_device_resources: 25,
      });
      beforeEach(() => {
        return store.dispatch(ADD_NODE_ACTION, node_1).then(() => {
          return store.dispatch(ADD_NODE_ACTION, node_2);
        });
      });
      it('should include the added nodes', () => {
        assertIncludeEquals([node_1, node_2]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[2, 400, 'remoteimport'], [0, 75, 'localexport'], [2, 400, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('when a Node with descendants in `include` is added', () => {
      // ...the descendants are removed from `include`, because they are made redundant by the Node
      const ancestorNode = makeNode('1_1', {
        path: simplePath('1'),
        on_device_resources: 3,
        importable_resources: 10,
      });
      const descendantNode_1 = makeNode('1_1_1', { path: simplePath('1', '1_1') });
      const descendantNode_2 = makeNode('1_1_1_1', { path: simplePath('1', '1_1', '1_1_1') });
      beforeEach(() => {
        return store
          .dispatch(ADD_NODE_ACTION, descendantNode_1)
          .then(() => store.dispatch(ADD_NODE_ACTION, descendantNode_2))
          .then(() => store.dispatch(ADD_NODE_ACTION, ancestorNode));
      });
      it('should include the ancestor nodes', () => {
        assertIncludeEquals([ancestorNode]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[1, 10, 'remoteimport'], [0, 3, 'localexport'], [1, 10, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('when a Node in `omit` is re-added', () => {
      // ...it and all its descendants are removed from "omit"
      const node = makeNode('1', {
        path: simplePath(),
        on_device_resources: 518,
        importable_resources: 753,
      });
      const childNode = makeNode('1_1', { path: simplePath('1') });
      const siblingNode = makeNode('1_2', { path: simplePath('1') });
      beforeEach(() => {
        setIncludedNodes([]);
        setOmittedNodes([node, childNode, siblingNode]);
        return store.dispatch(ADD_NODE_ACTION, node);
      });
      it('should include the added node', () => {
        assertIncludeEquals([node]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[1, 753, 'remoteimport'], [0, 518, 'localexport'], [1, 753, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('when the channel root node is added', () => {
      const node = makeNode(defaultChannel.root, {
        path: simplePath(),
        on_device_resources: 518,
        importable_resources: 753,
      });
      it.each(
        [
          [
            defaultChannel.importable_file_size_deduped,
            defaultChannel.importable_resources_deduped,
            'remoteimport',
          ],
          [defaultChannel.published_size, defaultChannel.total_resource_count, 'localexport'],
          [
            defaultChannel.importable_file_size_deduped,
            defaultChannel.importable_resources_deduped,
            'localimport',
          ],
        ],
        'should properly set resources: %d and size: %d for %s',
        (fileSize, resourceCount, transferType) => {
          Object.assign(store.state.manageContent.wizard, {
            transferredChannel: {
              ...defaultChannel,
            },
            transferType: transferType[2],
          });
          store.dispatch(ADD_NODE_ACTION, node).then(() => {
            assertFilesResourcesEqual(fileSize, resourceCount, transferType);
          });
        }
      );
    });

    describe('when the channel root node is added and it has duplicates', () => {
      // This test confirms that when a channel has duplicate files and resources
      // then we use the verified counts from the overall channel metadata, iff
      // we have added the entire channel.
      const node = makeNode(dupedChannel.root, {
        path: simplePath(),
        on_device_resources: 518,
        importable_resources: 753,
      });
      it.each(
        [
          [
            dupedChannel.importable_file_size_deduped,
            dupedChannel.importable_resources_deduped,
            'remoteimport',
          ],
          [dupedChannel.published_size, dupedChannel.total_resource_count, 'localexport'],
          [
            dupedChannel.importable_file_size_deduped,
            dupedChannel.importable_resources_deduped,
            'localimport',
          ],
          [
            dupedChannel.importable_file_size_deduped,
            dupedChannel.importable_resources_deduped,
            'peerimport',
          ],
        ],
        'should properly set resources: %d and size: %d for %s',
        (fileSize, resourceCount, transferType) => {
          Object.assign(store.state.manageContent.wizard, {
            transferredChannel: {
              ...dupedChannel,
            },
            transferType: transferType[2],
          });
          store.dispatch(ADD_NODE_ACTION, node).then(() => {
            assertFilesResourcesEqual(fileSize, resourceCount, transferType);
          });
        }
      );
    });

    // The case where all descendants of a node are selected is handled at select-content-page,
    // since the store does not have enough information to detect when this happens.
    // When this happens, the descendants are replaced with the ancestor node.
  });

  describe('removeNodeForTransfer action', () => {
    describe('removing a single Node that was originally in `include`', () => {
      // ...straightforwardly removes it from `include`
      const node_1 = makeNode('1_1_1', { path: simplePath('1', '1_1') });
      beforeEach(() => {
        return store.dispatch(ADD_NODE_ACTION, node_1).then(() => {
          return store.dispatch(REMOVE_NODE_ACTION, node_1);
        });
      });
      it('should not have any includes nodes', () => {
        assertIncludeEquals([]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[0, 0, 'remoteimport'], [0, 0, 'localexport'], [0, 0, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('removing a descendant of an included Node', () => {
      // ...adds the descendant to `omit`, but does not remove Node from `include`
      const parentNode = makeNode('1_1', {
        path: simplePath('1'),
        importable_resources: 50,
        on_device_resources: 20,
      });
      const childNode = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        importable_resources: 20,
        on_device_resources: 10,
      });
      beforeEach(() => {
        return store.dispatch(ADD_NODE_ACTION, parentNode).then(() => {
          return store.dispatch(REMOVE_NODE_ACTION, childNode);
        });
      });
      it('should include the parent node', () => {
        assertIncludeEquals([parentNode]);
      });
      it('should omit the child node', () => {
        assertOmitEquals([childNode]);
      });
      it.each(
        [[0, 30, 'remoteimport'], [0, 10, 'localexport'], [0, 30, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('removing a sibling is same as removing single Node', () => {
      const node_1 = makeNode('1_1', {
        path: simplePath('1'),
        on_device_resources: 525,
        importable_resources: 1222,
      });
      const node_2 = makeNode('1_2', { path: simplePath('1') });
      beforeEach(() => {
        return store
          .dispatch(ADD_NODE_ACTION, node_1)
          .then(() => {
            return store.dispatch(ADD_NODE_ACTION, node_2);
          })
          .then(() => {
            store.dispatch(REMOVE_NODE_ACTION, node_2);
          });
      });
      it('should include the added node', () => {
        assertIncludeEquals([node_1]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[1, 1222, 'remoteimport'], [0, 525, 'localexport'], [1, 1222, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('removing a Node removes it and all descendants from `include`', () => {
      const node = makeNode('1', {
        path: simplePath(),
        importable_resources: 15,
        on_device_resources: 10,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        importable_resources: 10,
        on_device_resources: 5,
      });
      const grandchildNode = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        importable_resources: 5,
        on_device_resources: 2,
      });
      beforeEach(() => {
        // Not sure how this state can happen in practice.
        // May need to remove or rewrite this test.
        setIncludedNodes([node, childNode, grandchildNode]);
        setOmittedNodes([]);
        return store.dispatch(REMOVE_NODE_ACTION, node);
      });
      it('should not have any includes nodes', () => {
        assertIncludeEquals([]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[0, 0, 'remoteimport'], [0, 0, 'localexport'], [0, 0, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('removing a Node removes its descendants from `omit`', () => {
      // ...since they are redundant
      const topNode = makeNode('1', {
        path: simplePath(),
        on_device_resources: 7,
        importable_resources: 21,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        on_device_resources: 2,
        importable_resources: 11,
      });
      const grandchildNode = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        on_device_resources: 0,
        importable_resources: 5,
      });
      beforeEach(() => {
        setIncludedNodes([topNode]);
        setOmittedNodes([grandchildNode]);
        // Not sure this is possible in practice. On UI, childNode will
        // be indeterminate, so user will need to click it once, making it selected
        // which will then remove grandchildNode. After then, they can de-select it.
        return store.dispatch(REMOVE_NODE_ACTION, childNode);
      });
      it('should include the top node', () => {
        assertIncludeEquals([topNode]);
      });
      it('should omit the child node', () => {
        assertOmitEquals([childNode]);
      });
      it.each(
        [[0, 10, 'remoteimport'], [0, 5, 'localexport'], [0, 10, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('when the a child is removed after the channel root node is added and it has duplicates', () => {
      // This test confirms that when we are not using the entire channel, then we do not
      // use the deduplicated verified content sizes and resource counts that are part of the
      // overall channel metadata, and instead revert to the estimates based on the top level topic
      // node and the omitted nodes.
      const node = makeNode(dupedChannel.root, {
        path: simplePath(dupedChannel.root),
        on_device_resources: 518,
        importable_resources: 753,
        importable_file_size: 100000000,
        on_device_file_size: 50000000,
      });
      const childNode = makeNode('1_1_1', {
        path: simplePath(dupedChannel.root, '1_1'),
        importable_resources: 20,
        on_device_resources: 10,
        importable_file_size: 10000000,
        on_device_file_size: 5000000,
      });
      beforeEach(() => {
        Object.assign(store.state.manageContent.wizard, {
          transferredChannel: {
            ...dupedChannel,
          },
        });
        return store.dispatch(ADD_NODE_ACTION, node).then(() => {
          return store.dispatch(REMOVE_NODE_ACTION, childNode);
        });
      });
      it('should include the added node', () => {
        expect(store.state.manageContent.wizard.nodesForTransfer.included).toEqual([node]);
      });
      it('should omit the child node', () => {
        expect(store.state.manageContent.wizard.nodesForTransfer.omitted).toEqual([childNode]);
      });
      it.each(
        [
          [
            (node.importable_file_size - childNode.importable_file_size) /
              dupedChannel.importable_file_duplication,
            Math.floor(
              Number.parseFloat(
                (node.importable_resources - childNode.importable_resources) /
                  dupedChannel.importable_resource_duplication
              ).toPrecision(2)
            ),
            'remoteimport',
          ],
          [
            (node.on_device_file_size - childNode.on_device_file_size) /
              dupedChannel.importable_file_duplication,
            Math.floor(
              Number.parseFloat(
                (node.on_device_resources - childNode.on_device_resources) /
                  dupedChannel.importable_resource_duplication
              ).toPrecision(2)
            ),
            'localexport',
          ],
          [
            (node.importable_file_size - childNode.importable_file_size) /
              dupedChannel.importable_file_duplication,
            Math.floor(
              Number.parseFloat(
                (node.importable_resources - childNode.importable_resources) /
                  dupedChannel.importable_resource_duplication
              ).toPrecision(2)
            ),
            'localimport',
          ],
        ],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('(IMPORT) when removing a Node leads to an included parent Node being un-selected', () => {
      // i.e. all of the parent's resources are omitted.
      // Then that parent node will be removed from `include`.
      // Then all of the parent node's descendants will be removed from `omit`.
      // This keeps the store clean of unnecessary Nodes.
      const topNode = makeNode('1', {
        path: simplePath(),
        importable_resources: 25, // 25-10 = 15 transferrable resources
        on_device_resources: 10,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        importable_resources: 15, // 10 transferrable
        on_device_resources: 5,
      });
      const siblingNode = makeNode('1_2', {
        path: simplePath('1'),
        importable_resources: 10, // 5 transferrable
        on_device_resources: 5,
      });
      beforeEach(() => {
        setIncludedNodes([topNode]);
        setOmittedNodes([childNode]);
        return store.dispatch(REMOVE_NODE_ACTION, siblingNode);
      });
      it('should not have any includes nodes', () => {
        assertIncludeEquals([]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[0, 0, 'remoteimport'], [0, 0, 'localexport'], [0, 0, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });

    describe('(EXPORT) when removing a Node leads to an included parent Node being un-selected', () => {
      const topNode = makeNode('1', {
        path: simplePath(),
        // Make it so that not all resources are installed
        importable_resources: 38,
        on_device_resources: 3,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        importable_resources: 9,
        on_device_resources: 2,
      });
      const siblingNode = makeNode('1_2', {
        path: simplePath('1'),
        importable_resources: 3,
        on_device_resources: 1,
      });
      beforeEach(() => {
        store.state.manageContent.wizard.transferType = 'localexport';
        setIncludedNodes([topNode]);
        setOmittedNodes([childNode]);
        return store.dispatch(REMOVE_NODE_ACTION, siblingNode);
      });
      it('should not have any includes nodes', () => {
        assertIncludeEquals([]);
      });
      it('should not have any ommited nodes', () => {
        assertOmitEquals([]);
      });
      it.each(
        [[0, 0, 'remoteimport'], [0, 0, 'localexport'], [0, 0, 'localimport']],
        'should properly set resources: %d and size: %d for %s',
        assertFilesResourcesEqual
      );
    });
  });
});

describe('updateTreeViewTopic action', () => {
  // There are integration tests in showSelectContentPage spec covers that CNG.getModel
  // is correctly called
  let store;
  const cngPayload = contentNodeGranularPayload();
  const topic_1 = { id: 'topic_1', title: 'Topic One' };
  const topic_2 = { id: 'topic_2', title: 'Topic Two' };
  const topic_3 = { id: 'topic_3', title: 'Topic Three' };
  const topic_4 = { id: 'topic_4', title: 'Topic Four' };

  topic_1.path = []; // like a channel
  topic_2.path = [topic_1];
  topic_3.path = [...topic_2.path, topic_2];
  topic_4.path = [...topic_3.path, topic_3];

  beforeEach(() => {
    store = makeSelectContentPageStore();
    ContentNodeGranularResource.fetchDetailCollection = jest.fn();
    ContentNodeGranularResource.fetchDetailCollection.mockReturnValue(Promise.resolve(cngPayload));
  });

  function assertPathEquals(expected) {
    expect(store.state.manageContent.wizard.path).toEqual(expected.map(omit('path')));
  }

  it('moving forward by one topic', () => {
    return updateTreeViewTopic(store, topic_1).then(() => assertPathEquals([]));
  });

  it('moving forward by more than one topic', () => {
    // i.e. going from a/b/c/d -> a -> a/b/c/d (by clicking back)
    return updateTreeViewTopic(store, topic_4)
      .then(() => updateTreeViewTopic(store, topic_1))
      .then(() => updateTreeViewTopic(store, topic_4))
      .then(() => assertPathEquals(topic_4.path));
  });

  it('moving backwards by more than one topic', () => {
    return updateTreeViewTopic(store, topic_4)
      .then(() => updateTreeViewTopic(store, topic_2))
      .then(() => assertPathEquals(topic_2.path));
  });
});
