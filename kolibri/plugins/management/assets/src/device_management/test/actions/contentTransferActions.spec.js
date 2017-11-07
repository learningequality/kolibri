/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import { addNodeForTransfer, removeNodeForTransfer, showSelectContentPage, updateTreeViewTopic } from '../../state/actions/contentTransferActions';
import * as mutations from '../../state/mutations/contentTransferMutations';
import { selectedNodes, wizardState } from '../../state/getters';
import { ChannelResource, ContentNodeGranularResource, TaskResource } from 'kolibri.resources';
import { mockResource } from 'testUtils'; // eslint-disable-line
import { makeNode, contentNodeGranularPayload, selectContentsPageState } from '../utils/data';

mockResource(ChannelResource);
mockResource(ContentNodeGranularResource);
mockResource(TaskResource);

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        wizardState: selectContentsPageState(),
      },
    },
    mutations,
  });
}

const defaultOptions = {
  localimport: {
    transferType: 'localimport',
    channel: {
      title: 'Channel One',
      id: 'channel_1',
      root: 'channel_1_root',
      isOnDevice: false
    },
    source: {
      type: 'LOCAL_DRIVE',
      driveId: 'drive_1',
    },
    taskPollInterval: 1,
  },
  remoteimport: {
    source: {
      type: 'REMOTE_SOURCE',
    },
    transferType: 'remoteimport',
    taskPollInterval: 1,
    channel: {
      title: 'Channel One',
      id: 'channel_1',
      root: 'channel_1_root',
      isOnDevice: false
    },
  },
  localexport: {
    transferType: 'localexport',
    channel: {
      id: 'channel_1',
      root: 'channel_1_root',
      title: 'Channel One',
      isOnDevice: true,
    },
    source: {
      type: 'LOCAL_DRIVE',
    },
    taskPollInterval: 1,
  }
};

describe('showSelectContentPage action', () => {
  let remoteChannelImportStub;
  let localChannelImportStub;

  before(() => {
    // add methods not in generic mock Resource
    TaskResource.startRemoteChannelImport = sinon.stub();
    TaskResource.startLocalChannelImport = sinon.stub();
    remoteChannelImportStub = TaskResource.startRemoteChannelImport;
    localChannelImportStub = TaskResource.startLocalChannelImport;
  });

  beforeEach(() => {
    localChannelImportStub.returns(Promise.resolve({ id: 'task_1' }));
    remoteChannelImportStub.returns(Promise.resolve({ id: 'task_1' }));
    TaskResource.__getCollectionFetchReturns([
      { id: 'task_1', status: 'COMPLETED', percentage: 1.0 },
    ]);
  });

  afterEach(() => {
    ChannelResource.__resetMocks();
    ContentNodeGranularResource.__resetMocks();
    TaskResource.__resetMocks();
    remoteChannelImportStub.reset();
    localChannelImportStub.reset();
  });

  describe('error handling', () => {
    it('errors from "importchannel" are handled', () => {
      const store = makeStore();
      localChannelImportStub.returns(Promise.reject());
      // can change options to defaultOptions.remoteimport too
      return showSelectContentPage(store, defaultOptions.localimport)
        .then(() => {
          assert.equal(wizardState(store.state).status, 'CONTENT_DB_LOADING_ERROR');
        });
    });

    it('errors from ContentNodeGranular API are handled', () => {
      const store = makeStore();
      ContentNodeGranularResource.__getModelFetchReturns({}, true);
      // can change options to defaultOptions.localimport/localexport too
      return showSelectContentPage(store, defaultOptions.remoteimport)
        .then(() => {
          assert.equal(wizardState(store.state).status, 'TREEVIEW_LOADING_ERROR');
        });
    });
  });

  describe('when transfer type is "localimport"', () => {
    const options = defaultOptions.localimport;

    it('if channel is on device, then "importchannel" is never called', () => {
      const store = makeStore();
      return showSelectContentPage(store, {
        ...options,
        channel: { id: 'channel_1', isOnDevice: true },
      })
        .then(() => {
          sinon.assert.notCalled(localChannelImportStub);
          sinon.assert.notCalled(remoteChannelImportStub);
        });
    });

    it('if channel is not on device, then "importchannel" is called', () => {
      const store = makeStore();
      return showSelectContentPage(store, options)
        .then(() => {
          sinon.assert.calledOnce(localChannelImportStub);
          sinon.assert.calledWith(localChannelImportStub, {
            channel_id: 'channel_1',
            drive_id: 'drive_1',
          });
          sinon.assert.notCalled(remoteChannelImportStub);
        });
    });

    it('the correct request to ContentNodeGranular API is made', () => {
      // ...and wizardState.treeView is properly hydrated
      const store = makeStore();
      const getModelStub = ContentNodeGranularResource.getModel;
      const cngPayload = contentNodeGranularPayload();
      const fetchableSpy = ContentNodeGranularResource.__getModelFetchReturns(cngPayload);
      return showSelectContentPage(store, options)
        .then(() => {
          sinon.assert.calledWith(fetchableSpy.fetch, {
            import_export: 'import',
            drive_id: 'drive_1',
          });
          sinon.assert.calledWith(getModelStub, 'channel_1_root');
          assert.deepEqual(wizardState(store.state).treeView.currentNode, cngPayload);
          assert.deepEqual(wizardState(store.state).treeView.breadcrumbs, [
            { id: 'channel_1_root', title: 'Channel One' },
          ]);
        });
    });
  });

  describe('when transfer type is "remoteimport"', () => {
    const options = defaultOptions.remoteimport;

    it('if channel DB is on device, then "importchannel" is never called', () => {
      const store = makeStore();
      return showSelectContentPage(store, {
        ...options,
        channel: { id: 'channel_1', isOnDevice: true },
      })
        .then(() => {
          sinon.assert.notCalled(localChannelImportStub);
          sinon.assert.notCalled(remoteChannelImportStub);
        });
    });

    it('if channel DB is not on device, then "importchannel" is called', () => {
      const store = makeStore();
      return showSelectContentPage(store, options)
        .then(() => {
          sinon.assert.calledOnce(remoteChannelImportStub);
          sinon.assert.calledWith(remoteChannelImportStub, {
            channel_id: 'channel_1',
          });
          sinon.assert.notCalled(localChannelImportStub);
        });
    });

    it('the correct request to ContentNodeGranular API is made', () => {
      // ...and wizardState.treeView is properly hydrated
      const store = makeStore();
      const getModelStub = ContentNodeGranularResource.getModel;
      const cngPayload = contentNodeGranularPayload();
      const fetchableSpy = ContentNodeGranularResource.__getModelFetchReturns(cngPayload);
      return showSelectContentPage(store, options)
        .then(() => {
          sinon.assert.calledWith(fetchableSpy.fetch, {
            import_export: 'import',
          });
          sinon.assert.calledWith(getModelStub, 'channel_1_root');
          assert.deepEqual(wizardState(store.state).treeView.currentNode, cngPayload);
          assert.deepEqual(wizardState(store.state).treeView.breadcrumbs, [
            { id: 'channel_1_root', title: 'Channel One' },
          ]);
        });
    });
  });

  describe('when transfer type is "localexport"', () => {
    const options = defaultOptions.localexport;

    it('"importchannel" is never called', () => {
      // ...because you can only export what is on the device already
      const store = makeStore();
      return showSelectContentPage(store, options)
        .then(() => {
          sinon.assert.notCalled(localChannelImportStub);
          sinon.assert.notCalled(remoteChannelImportStub);
        });
    });

    it('the correct request to ContentNodeGranular API is made', () => {
      // ...and wizardState.treeView is hydrated correctly
      const cngPayload = contentNodeGranularPayload();
      const getModelStub = ContentNodeGranularResource.getModel;
      const fetchableSpy = ContentNodeGranularResource.__getModelFetchReturns(cngPayload);
      const store = makeStore();
      return showSelectContentPage(store, options)
        .then(() => {
          sinon.assert.calledWith(fetchableSpy.fetch, { import_export: 'export' });
          sinon.assert.calledWith(getModelStub, 'channel_1_root');
          assert.deepEqual(wizardState(store.state).treeView.currentNode, cngPayload);
          assert.deepEqual(wizardState(store.state).treeView.breadcrumbs, [
            { id: 'channel_1_root', title: 'Channel One' },
          ]);
        });
    });
  });

  describe('during content DB download (during "importchannel" task)', () => {
    it('wizardState.channelImportTask is updated', () => {
      const store = makeStore();
      TaskResource.getCollection.onFirstCall().returns(TaskResource.__getFetchable([
        { id: 'task_1', status: 'RUNNING', percentage: 0.1 },
        { id: 'task_2', status: 'COMPLETED', percentage: 1.0 },
      ]));
      TaskResource.getCollection.onSecondCall().returns(TaskResource.__getFetchable([
        { id: 'task_1', status: 'COMPLETED', percentage: 1.0 },
        { id: 'task_2', status: 'COMPLETED', percentage: 1.0 },
      ]));
      return showSelectContentPage(store, defaultOptions.remoteimport)
        .then(() => {
          assert.deepEqual(wizardState(store.state).channelImportTask, {
            id: 'task_1', status: 'COMPLETED', percentage: 1.0,
          });
        });
    });

    it('error is handled when no matching Task is in queue', () => {
      const getModelStub = ContentNodeGranularResource.getModel;
      TaskResource.__getCollectionFetchReturns([]);
      const store = makeStore();
      return showSelectContentPage(store, defaultOptions.localimport)
        .then(() => {
          sinon.assert.notCalled(getModelStub);
          assert.deepEqual(wizardState(store.state).status, 'TASK_POLLING_ERROR');
        });
    });

    it('error is handled when Task fails for other reason', () => {
      const getModelStub = ContentNodeGranularResource.getModel;
      TaskResource.__getCollectionFetchReturns([], true);
      const store = makeStore();
      return showSelectContentPage(store, defaultOptions.remoteimport)
        .then(() => {
          sinon.assert.notCalled(getModelStub);
          assert.deepEqual(wizardState(store.state).status, 'TASK_POLLING_ERROR');
        });
    });
  });
});

describe('node selection actions', () => {
  let store;
  function nodeCounts(store) {
    return {
      files: wizardState(store.state).selectedItems.total_file_size,
      resources: wizardState(store.state).selectedItems.total_resource_count,
    };
  }

  beforeEach(() => {
    store = makeStore();
  });

  describe('addNodeForTransfer action', () => {
    it('adding a single node to empty list', () => {
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      assert.deepEqual(selectedNodes(store.state), {
        include: [node_1],
        omit: [],
      });
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });

    it('adding nodes that are not parent/child to each other', () => {
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      const node_2 = makeNode('1_2_1', { path: ['1', '1_2'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      assert.deepEqual(selectedNodes(store.state), {
        include: [node_1, node_2],
        omit: [],
      });
      assert.deepEqual(nodeCounts(store), {
        files: 2,
        resources: 2,
      });
    });

    it('when a node is added, its descendants are removed from "include"', () => {
      // ...because they are redundant
      const ancestorNode = makeNode('1_1', {
        fileSize: 3,
        path: ['1'],
        total_resources: 3,
      });
      const descendantNode = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, descendantNode);
      addNodeForTransfer(store, ancestorNode);
      assert.deepEqual(selectedNodes(store.state), {
        include: [ancestorNode],
        omit: [],
      });
      // files/resources are not double counted
      assert.deepEqual(nodeCounts(store), {
        files: 3,
        resources: 3,
      });
    });

    it('when a node is added, it and all its descendants are removed from "omit"', () => {
      const node = makeNode('1', { path: [] });
      const childNode = makeNode('1_1', { path: ['1'] });
      const siblingNode = makeNode('1_2', { path: ['1'] });
      store.state.pageState.wizardState.selectedItems.nodes = {
        include: [],
        omit: [node, childNode, siblingNode],
      };
      addNodeForTransfer(store, node);
      assert.deepEqual(selectedNodes(store.state), {
        include: [node],
        omit: [],
      });
    });

    // The case where all descendants of a node are selected is handled at select-content-page,
    // since the store does not have enough information to detect when this happens.
    // When this happens, the descendants are replaced with the ancestor node.
  });

  describe('removeNodeForTransfer action', () => {
    it('removing a single node', () => {
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      assert.deepEqual(selectedNodes(store.state), {
        include: [node_1],
        omit: [],
      });
      removeNodeForTransfer(store, node_1);
      assert.deepEqual(selectedNodes(store.state), {
        include: [],
        omit: [],
      });
      assert.deepEqual(nodeCounts(store), {
        files: 0,
        resources: 0,
      });
    });

    it('removing a child/descendant of an included node', () => {
      // ...adds descendant to 'omit', does not remove node from 'include'
      const parentNode = makeNode('1_1', {
        path: ['1'],
        total_resources: 50,
        fileSize: 50,
      });
      const childNode = makeNode('1_1_1', {
        path: ['1', '1_1'],
        total_resources: 20,
        fileSize: 20,
      });
      addNodeForTransfer(store, parentNode);
      removeNodeForTransfer(store, childNode);
      assert.deepEqual(selectedNodes(store.state), {
        include: [parentNode],
        omit: [childNode],
      });
      assert.deepEqual(nodeCounts(store), {
        files: 30,
        resources: 30,
      });
    });

    it('removing a sibling is same as removing single node', () => {
      const node_1 = makeNode('1_1', { path: ['1'] });
      const node_2 = makeNode('1_2', { path: ['1'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      removeNodeForTransfer(store, node_2);
      assert.deepEqual(selectedNodes(store.state), {
        include: [node_1],
        omit: [],
      });
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });

    it('removing a node removes it and all descendants from "include"', () => {
      const node = makeNode('1', {
        path: [],
        total_resources: 15,
        resources_on_device: 8,
      });
      const childNode = makeNode('1_1', {
        path: ['1'],
        total_resources: 10,
        resources_on_device: 2,
      });
      const grandchildNode = makeNode('1_1_1', {
        path: ['1', '1_1'],
        total_resources: 5,
        resources_on_device: 0,

      });
      store.state.pageState.wizardState.selectedItems.nodes = {
        include: [node, childNode, grandchildNode],
        omit: [],
      };
      removeNodeForTransfer(store, childNode);
      assert.deepEqual(selectedNodes(store.state), {
        include: [node],
        omit: [childNode],
      });
    });

    it('removing a node removes its descendants from "omit"', () => {
      // ...since they are redundant
      const topNode = makeNode('1', {
        path: [],
        total_resources: 15,
        resources_on_device: 8,
      });
      const childNode = makeNode('1_1', {
        path: ['1'],
        total_resources: 10,
        resources_on_device: 2,
      });
      const grandchildNode = makeNode('1_1_1', {
        path: ['1', '1_1'],
        total_resources: 5,
        resources_on_device: 0,

      });
      store.state.pageState.wizardState.selectedItems.nodes = {
        include: [topNode],
        omit: [grandchildNode],
      };
      removeNodeForTransfer(store, childNode);
      assert.deepEqual(selectedNodes(store.state), {
        include: [topNode],
        omit: [childNode],
      });
    });

    it('when removing a node leads to an "included" node being un-selected', () => {
      // i.e. all of its resources are omitted
      // then remove that included node, plus all of the nodes that were omitted
      // this keeps the array clean of unnecessary nodes
      const topNode = makeNode('1', {
        path: [],
        total_resources: 25, // 25-10 = 15 transferrable resources
        resources_on_device: 10,
      });
      const childNode = makeNode('1_1', {
        path: ['1'],
        total_resources: 15, // 10 transferrable
        resources_on_device: 5,
      });
      const siblingNode = makeNode('1_2', {
        path: ['1'],
        total_resources: 10, // 5 transferrable
        resources_on_device: 5,
      });
      // NOTE: when total_resources === resources_on_device, then that node is
      // not selectable, so we always need to compare the difference (i.e transferrable #)
      store.state.pageState.wizardState.selectedItems.nodes = {
        include: [topNode],
        omit: [childNode],
      };
      removeNodeForTransfer(store, siblingNode);
      assert.deepEqual(selectedNodes(store.state), {
        include: [],
        omit: [],
      });
    });
  });
});

describe('updateTreeViewTopic action', () => {
  let store;
  const cngPayload = contentNodeGranularPayload();
  const topic_1 = { id: 'topic_1', title: 'Topic One' };
  const topic_2 = { id: 'topic_2', title: 'Topic Two' };

  beforeEach(() => {
    store = makeStore();
    ContentNodeGranularResource.__getModelFetchReturns(cngPayload);
  });

  it('updates the current node in wizardState.treeView', () => {
    return updateTreeViewTopic(store, topic_1)
      .then(() => {
        assert.deepEqual(wizardState(store.state).treeView.currentNode, cngPayload);
      });
  });

  it('updates the breadcrumbs and path in wizardState', () => {
    return updateTreeViewTopic(store, topic_1)
      .then(() => updateTreeViewTopic(store, topic_2))
      .then(() => {
        assert.deepEqual(wizardState(store.state).treeView.breadcrumbs, [topic_1, topic_2]);
        assert.deepEqual(wizardState(store.state).path, ['topic_1', 'topic_2']);
      });
  });

  it('handles errors from ContentNodeGranular API', () => {
    ContentNodeGranularResource.__getModelFetchReturns({}, true);
    return updateTreeViewTopic(store, topic_1)
      .then(() => {
        assert.equal(wizardState(store).status, 'TREEVIEW_LOADING_ERROR');
      });
  });
});
