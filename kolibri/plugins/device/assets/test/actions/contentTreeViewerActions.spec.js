//
import omit from 'lodash/fp/omit';
import { jestMockResource } from 'testUtils'; // eslint-disable-line
import { ContentNodeGranularResource, TaskResource } from 'kolibri.resources';
import client from 'kolibri.client';
import { makeNode, contentNodeGranularPayload } from '../utils/data';
import { updateTreeViewTopic } from '../../src/modules/wizard/handlers';
import ChannelResource from '../../src/apiResources/deviceChannel';
import { makeSelectContentPageStore } from '../utils/makeStore';

const simplePath = (...ids) => ids.map(id => ({ id, title: `node_${id}` }));

jest.mock('kolibri.urls');
jest.mock('kolibri.client');

jestMockResource(ChannelResource);
jestMockResource(ContentNodeGranularResource);
jestMockResource(TaskResource);

const ADD_NODE_ACTION = 'manageContent/wizard/addNodeForTransfer';
const REMOVE_NODE_ACTION = 'manageContent/wizard/removeNodeForTransfer';

describe('contentTreeViewer actions', () => {
  let store;

  function assertIncludeEquals(expected) {
    // HACK add the hard-coded file sizes to the expected array
    expect(store.state.manageContent.wizard.nodesForTransfer.included).toEqual(expected);
  }

  function assertOmitEquals(expected) {
    expect(store.state.manageContent.wizard.nodesForTransfer.omitted).toEqual(expected);
  }

  function setIncludedNodes(nodes) {
    store.state.manageContent.wizard.nodesForTransfer.included = nodes;
  }

  function setOmittedNodes(nodes) {
    store.state.manageContent.wizard.nodesForTransfer.omitted = nodes;
  }

  beforeEach(() => {
    // For now, just keep it simple and make the file size result 0/1
    // TODO extend this mock to return arbitrary file sizes
    client.__setPayload({
      file_size: 1,
      resource_count: 1,
    });
    store = makeSelectContentPageStore();
  });

  afterEach(() => {
    client.__reset();
  });

  /**
   * Notes:
   * `makeNode` gives each Node a resource and file count of 1 by default,
   * with 0 file/resources on the device, so the asserted file sizes may be unrealistic
   *
   */
  describe('addNodeForTransfer action', () => {
    it('adding a single Node to empty list', () => {
      // ...straightforwardly adds it to `include`
      const node_1 = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        total_resources: 200,
        on_device_resources: 50,
      });
      return store.dispatch(ADD_NODE_ACTION, node_1).then(() => {
        assertIncludeEquals([node_1]);
        assertOmitEquals([]);
      });
    });

    it('adding Nodes that are not parent/child to each other', () => {
      // ...straightforwardly adds both to `include`
      const node_1 = makeNode('1_1_1', {
        path: simplePath('1', '1_1'),
        total_resources: 200,
        on_device_resources: 50,
      });
      const node_2 = makeNode('2_2_1', {
        path: simplePath('2', '2_2'),
        total_resources: 200,
        on_device_resources: 25,
      });
      return store
        .dispatch(ADD_NODE_ACTION, node_1)
        .then(() => {
          return store.dispatch(ADD_NODE_ACTION, node_2);
        })
        .then(() => {
          assertIncludeEquals([node_1, node_2]);
          assertOmitEquals([]);
        });
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
      return store
        .dispatch(ADD_NODE_ACTION, descendantNode_1)
        .then(() => store.dispatch(ADD_NODE_ACTION, descendantNode_2))
        .then(() => store.dispatch(ADD_NODE_ACTION, ancestorNode))
        .then(() => {
          assertIncludeEquals([ancestorNode]);
          assertOmitEquals([]);
          // files/resources are not double counted
        });
    });

    it('when a Node in `omit` is re-added', () => {
      // ...it and all its descendants are removed from "omit"
      const node = makeNode('1', {
        path: simplePath(),
        on_device_resources: 518,
        total_resources: 753,
      });
      const childNode = makeNode('1_1', { path: simplePath('1') });
      const siblingNode = makeNode('1_2', { path: simplePath('1') });
      setIncludedNodes([]);
      setOmittedNodes([node, childNode, siblingNode]);
      return store.dispatch(ADD_NODE_ACTION, node).then(() => {
        assertIncludeEquals([node]);
        assertOmitEquals([]);
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
      return store
        .dispatch(ADD_NODE_ACTION, node_1)
        .then(() => {
          assertIncludeEquals([node_1]);
          assertOmitEquals([]);
          return store.dispatch(REMOVE_NODE_ACTION, node_1);
        })
        .then(() => {
          assertIncludeEquals([]);
          assertOmitEquals([]);
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
      return store
        .dispatch(ADD_NODE_ACTION, parentNode)
        .then(() => {
          return store.dispatch(REMOVE_NODE_ACTION, childNode);
        })
        .then(() => {
          assertIncludeEquals([parentNode]);
          assertOmitEquals([childNode]);
        });
    });

    it('removing a sibling is same as removing single Node', () => {
      const node_1 = makeNode('1_1', {
        path: simplePath('1'),
        on_device_resources: 525,
        total_resources: 1222,
      });
      const node_2 = makeNode('1_2', { path: simplePath('1') });
      return store
        .dispatch(ADD_NODE_ACTION, node_1)
        .then(() => {
          return store.dispatch(ADD_NODE_ACTION, node_2);
        })
        .then(() => {
          store.dispatch(REMOVE_NODE_ACTION, node_2);
        })
        .then(() => {
          assertIncludeEquals([node_1]);
          assertOmitEquals([]);
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
      return store.dispatch(REMOVE_NODE_ACTION, node).then(() => {
        assertIncludeEquals([]);
        assertOmitEquals([]);
      });
    });

    it('removing a Node removes its descendants from `omit`', () => {
      // ...since they are redundant
      const topNode = makeNode('1', {
        path: simplePath(),
        on_device_resources: 7,
        total_resources: 21,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        on_device_resources: 2,
        total_resources: 11,
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
      return store.dispatch(REMOVE_NODE_ACTION, childNode).then(() => {
        assertIncludeEquals([topNode]);
        assertOmitEquals([childNode]);
      });
    });

    it('(IMPORT) when removing a Node leads to an included parent Node being un-selected', () => {
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
      return store.dispatch(REMOVE_NODE_ACTION, siblingNode).then(() => {
        assertIncludeEquals([]);
        assertOmitEquals([]);
      });
    });

    it('(EXPORT) when removing a Node leads to an included parent Node being un-selected', () => {
      store.state.manageContent.wizard.transferType = 'localexport';
      const topNode = makeNode('1', {
        path: simplePath(),
        // Make it so that not all resources are installed
        total_resources: 38,
        on_device_resources: 3,
      });
      const childNode = makeNode('1_1', {
        path: simplePath('1'),
        total_resources: 9,
        on_device_resources: 2,
      });
      const siblingNode = makeNode('1_2', {
        path: simplePath('1'),
        total_resources: 3,
        on_device_resources: 1,
      });
      setIncludedNodes([topNode]);
      setOmittedNodes([childNode]);
      return store.dispatch(REMOVE_NODE_ACTION, siblingNode).then(() => {
        assertIncludeEquals([]);
        assertOmitEquals([]);
      });
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
    ContentNodeGranularResource.__getModelFetchReturns(cngPayload);
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
