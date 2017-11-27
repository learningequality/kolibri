/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import omit from 'lodash/fp/omit';
import { mockResource } from 'testUtils'; // eslint-disable-line
import mutations from '../../state/mutations';
import { ChannelResource, ContentNodeGranularResource, TaskResource } from 'kolibri.resources';
import {
  addNodeForTransfer,
  removeNodeForTransfer,
} from '../../state/actions/contentTreeViewerActions';
import { makeNode, contentNodeGranularPayload } from '../utils/data';
import { nodesForTransfer, wizardState, nodeTransferCounts } from '../../state/getters';
import { updateTreeViewTopic } from '../../state/actions/selectContentActions';
import { importExportWizardState } from '../../state/wizardState';

const simplePath = (...pks) => pks.map(pk => ({ pk, title: `node_${pk}` }));

mockResource(ChannelResource);
mockResource(ContentNodeGranularResource);
mockResource(TaskResource);

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        taskList: [],
        channelList: [],
        wizardState: importExportWizardState(),
      },
    },
    mutations,
  });
}

describe('contentTreeViewer actions', () => {
  let store;

  function assertIncludeEquals(expected) {
    // HACK add the hard-coded file sizes to the expected array
    assert.deepEqual(nodesForTransfer(store.state).included, expected.map(addFileSizes));
  }

  function assertOmitEquals(expected) {
    assert.deepEqual(nodesForTransfer(store.state).omitted, expected.map(addFileSizes));
  }

  function assertFilesResourcesEqual(expectedFiles, expectedResources) {
    // Maybe rename these so they don't clash with API.
    const { fileSize, resources } = nodeTransferCounts(store.state);
    assert.equal(fileSize, expectedFiles);
    assert.equal(resources, expectedResources);
  }

  function setIncludedNodes(nodes) {
    nodesForTransfer(store.state).included = nodes.map(addFileSizes);
  }

  function setOmittedNodes(nodes) {
    nodesForTransfer(store.state).omitted = nodes.map(addFileSizes);
  }

  before(() => {
    ContentNodeGranularResource.getFileSizes = sinon.stub();
  });

  beforeEach(() => {
    store = makeStore();
    // For now, just keep it simple and make the file size result 0/1
    // TODO extend this mock to return arbitrary file sizes
    ContentNodeGranularResource.getFileSizes.returns(
      Promise.resolve({
        entity: {
          total_file_size: 1,
          on_device_file_size: 0,
        },
      })
    );
  });

  afterEach(() => {
    ContentNodeGranularResource.getFileSizes.reset();
  });

  function addFileSizes(node) {
    return {
      ...node,
      total_file_size: 1,
      on_device_file_size: 0,
    };
  }

  /**
   * Notes:
   * `makeNode` gives each Node a resource and file count of 1 by default,
   * with 0 file/resources on the device
   *
   * assertFilesResourcesEqual counts items to be imported or exported, so it is not the totals
   * of the Nodes, but rather the totals of what's actually on the devices
   */
  describe('addNodeForTransfer action', () => {
    it('adding a single Node to empty list', () => {
      // ...straightforwardly adds it to `include`
      const node_1 = makeNode('1_1_1', { path: simplePath('1', '1_1') });
      return addNodeForTransfer(store, node_1).then(() => {
        assertIncludeEquals([node_1]);
        assertOmitEquals([]);
        assertFilesResourcesEqual(1, 1);
      });
    });

    it('adding Nodes that are not parent/child to each other', () => {
      // ...straightforwardly adds both to `include`
      const node_1 = makeNode('1_1_1', { path: simplePath('1', '1_1') });
      const node_2 = makeNode('2_2_1', { path: simplePath('2', '2_2') });
      return addNodeForTransfer(store, node_1)
        .then(() => {
          return addNodeForTransfer(store, node_2);
        })
        .then(() => {
          assertIncludeEquals([node_1, node_2]);
          assertOmitEquals([]);
          assertFilesResourcesEqual(2, 2);
        });
      // console.log(store.state.pageState.wizardState.nodesForTransfer.included);
    });

    it('when a Node with descendants in `include` is added', () => {
      // ...the descendants are removed from `include`, because they are made redundant by the Node
      const ancestorNode = makeNode('1_1', {
        path: simplePath('1'),
        on_device_resources: 3,
        total_resources: 10,
      });
      const descendantNode_1 = makeNode('1_1_1', { path: simplePath('1', '1_1') });
      const descendantNode_2 = makeNode('1_1_1_1', { path: simplePath('1', '1_1', '1_1_1') });
      return addNodeForTransfer(store, descendantNode_1)
        .then(() => addNodeForTransfer(store, descendantNode_2))
        .then(() => addNodeForTransfer(store, ancestorNode))
        .then(() => {
          assertIncludeEquals([ancestorNode]);
          assertOmitEquals([]);
          // files/resources are not double counted
          assertFilesResourcesEqual(1, 10);
        });
    });

    it('when a Node in `omit` is re-added', () => {
      // ...it and all its descendants are removed from "omit"
      const node = makeNode('1', { path: simplePath() });
      const childNode = makeNode('1_1', { path: simplePath('1') });
      const siblingNode = makeNode('1_2', { path: simplePath('1') });
      setIncludedNodes([]);
      setOmittedNodes([node, childNode, siblingNode]);
      return addNodeForTransfer(store, node).then(() => {
        assertIncludeEquals([node]);
        assertOmitEquals([]);
        assertFilesResourcesEqual(1, 1);
      });
    });

    // The case where all descendants of a node are selected is handled at select-content-page,
    // since the store does not have enough information to detect when this happens.
    // When this happens, the descendants are replaced with the ancestor node.
  });

  describe('removeNodeForTransfer action', () => {
    it('removing a single Node that was originally in `include`', () => {
      // ...straightforwardly removes it from `include`
      const node_1 = makeNode('1_1_1', { path: simplePath('1', '1_1') });
      return addNodeForTransfer(store, node_1)
        .then(() => {
          assertIncludeEquals([node_1]);
          assertOmitEquals([]);
          return removeNodeForTransfer(store, node_1);
        })
        .then(() => {
          assertIncludeEquals([]);
          assertOmitEquals([]);
          assertFilesResourcesEqual(0, 0);
        });
    });

    it('removing a descendant of an included Node', () => {
      // ...adds the descendant to `omit`, but does not remove Node from `include`
      const parentNode = makeNode('1_1', {
        path: simplePath('1'),
        total_resources: 50,
        on_device_resources: 20,
      });
      const childNode = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        total_resources: 20,
        on_device_resources: 10,
      });
      return addNodeForTransfer(store, parentNode)
        .then(() => {
          return removeNodeForTransfer(store, childNode);
        })
        .then(() => {
          assertIncludeEquals([parentNode]);
          assertOmitEquals([childNode]);
          assertFilesResourcesEqual(0, 30);
        });
    });

    it('removing a sibling is same as removing single Node', () => {
      const node_1 = makeNode('1_1', { path: simplePath('1') });
      const node_2 = makeNode('1_2', { path: simplePath('1') });
      return addNodeForTransfer(store, node_1)
        .then(() => {
          return addNodeForTransfer(store, node_2);
        })
        .then(() => {
          removeNodeForTransfer(store, node_2);
        })
        .then(() => {
          assertIncludeEquals([node_1]);
          assertOmitEquals([]);
          assertFilesResourcesEqual(1, 1);
        });
    });

    it('removing a Node removes it and all descendants from `include`', () => {
      const node = makeNode('1', {
        path: simplePath(),
        total_resources: 15,
        on_device_resources: 10,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        total_resources: 10,
        on_device_resources: 5,
      });
      const grandchildNode = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        total_resources: 5,
        on_device_resources: 2,
      });
      // Not sure how this state can happen in practice.
      // May need to remove or rewrite this test.
      setIncludedNodes([node, childNode, grandchildNode]);
      setOmittedNodes([]);
      return removeNodeForTransfer(store, node).then(() => {
        assertIncludeEquals([]);
        assertOmitEquals([]);
        assertFilesResourcesEqual(0, 0);
      });
    });

    it('removing a Node removes its descendants from `omit`', () => {
      // ...since they are redundant
      const topNode = makeNode('1', {
        path: simplePath(),
        on_device_resources: 8,
        total_resources: 15,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        on_device_resources: 2,
        total_resources: 10,
      });
      const grandchildNode = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        on_device_resources: 0,
        total_resources: 5,
      });
      setIncludedNodes([topNode]);
      setOmittedNodes([grandchildNode]);
      // Not sure this is possible in practice. On UI, childNode will
      // be indeterminate, so user will need to click it once, making it selected
      // which will then remove grandchildNode. After then, they can de-select it.
      return removeNodeForTransfer(store, childNode).then(() => {
        assertIncludeEquals([topNode]);
        assertOmitEquals([childNode]);
        assertFilesResourcesEqual(0, 5);
      });
    });

    it('when removing a Node leads to an included parent Node being un-selected', () => {
      // i.e. all of the parent's resources are omitted.
      // Then that parent node will be removed from `include`.
      // Then all of the parent node's descendants will be removed from `omit`.
      // This keeps the store clean of unnecessary Nodes.
      const topNode = makeNode('1', {
        path: simplePath(),
        total_resources: 25, // 25-10 = 15 transferrable resources
        on_device_resources: 10,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        total_resources: 15, // 10 transferrable
        on_device_resources: 5,
      });
      const siblingNode = makeNode('1_2', {
        path: simplePath('1'),
        total_resources: 10, // 5 transferrable
        on_device_resources: 5,
      });
      setIncludedNodes([topNode]);
      setOmittedNodes([childNode]);
      return removeNodeForTransfer(store, siblingNode).then(() => {
        assertIncludeEquals([]);
        assertOmitEquals([]);
        assertFilesResourcesEqual(0, 0);
      });
    });
  });
});

describe('updateTreeViewTopic action', () => {
  // There are integration tests in showSelectContentPage spec covers that CNG.getModel
  // is correctly called
  let store;
  const cngPayload = contentNodeGranularPayload();
  const topic_1 = { pk: 'topic_1', title: 'Topic One' };
  const topic_2 = { pk: 'topic_2', title: 'Topic Two' };
  const topic_3 = { pk: 'topic_3', title: 'Topic Three' };
  const topic_4 = { pk: 'topic_4', title: 'Topic Four' };

  topic_1.path = []; // like a channel
  topic_2.path = [topic_1];
  topic_3.path = [...topic_2.path, topic_2];
  topic_4.path = [...topic_3.path, topic_3];

  beforeEach(() => {
    store = makeStore();
    ContentNodeGranularResource.__getModelFetchReturns(cngPayload);
  });

  function assertPathEquals(expected) {
    assert.deepEqual(wizardState(store.state).path, expected.map(omit('path')));
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
