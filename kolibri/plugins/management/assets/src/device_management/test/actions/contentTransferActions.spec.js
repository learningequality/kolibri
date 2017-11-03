/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import { addNodeForTransfer, removeNodeForTransfer, showSelectContentPage, goToTopic } from '../../state/actions/contentTransferActions';
import * as mutations from '../../state/mutations/contentTransferMutations';
import { selectedNodes } from '../../state/getters';
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

function nodeCounts(store) {
  return {
    files: store.state.pageState.wizardState.selectedItems.total_file_size,
    resources: store.state.pageState.wizardState.selectedItems.total_resource_count,
  };
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

describe.only('showSelectContentPage action', () => {
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
          assert.equal(store.state.pageState.wizardState.status, 'CONTENT_DB_LOADING_ERROR');
        });
    });

    it('errors from ContentNodeGranular API are handled', () => {
      const store = makeStore();
      ContentNodeGranularResource.__getModelFetchReturns({}, true);
      // can change options to defaultOptions.localimport/localexport too
      return showSelectContentPage(store, defaultOptions.remoteimport)
        .then(() => {
          assert.equal(store.state.pageState.wizardState.status, 'TREEVIEW_LOADING_ERROR');
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
          assert.deepEqual(store.state.pageState.wizardState.treeView.currentNode, cngPayload);
          assert.deepEqual(store.state.pageState.wizardState.treeView.breadcrumbs, [
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
          assert.deepEqual(store.state.pageState.wizardState.treeView.currentNode, cngPayload);
          assert.deepEqual(store.state.pageState.wizardState.treeView.breadcrumbs, [
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
          assert.deepEqual(store.state.pageState.wizardState.treeView.currentNode, cngPayload);
          assert.deepEqual(store.state.pageState.wizardState.treeView.breadcrumbs, [
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
          assert.deepEqual(store.state.pageState.wizardState.channelImportTask, {
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
          assert.deepEqual(store.state.pageState.wizardState.status, 'TASK_POLLING_ERROR');
        });
    });

    it('error is handled when Task fails for other reason', () => {
      const getModelStub = ContentNodeGranularResource.getModel;
      TaskResource.__getCollectionFetchReturns([], true);
      const store = makeStore();
      return showSelectContentPage(store, defaultOptions.remoteimport)
        .then(() => {
          sinon.assert.notCalled(getModelStub);
          assert.deepEqual(store.state.pageState.wizardState.status, 'TASK_POLLING_ERROR');
        });
    });
  });
});

describe('node selection actions actions', () => {

  const includeList = store => selectedNodes(store.state).include;
  const omitList = store => selectedNodes(store.state).omit;

  describe('addNodeForTransfer action', () => {
    it('adding a single node to empty list', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      assert.deepEqual(includeList(store), [node_1]);
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });

    it('adding nodes that are not parent/child to each other', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      const node_2 = makeNode('1_2_1', { path: ['1', '1_2'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      assert.deepEqual(includeList(store), [node_1, node_2]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 2,
        resources: 2,
      });
    });

    it('nodes that are made redundant by adding ancestor node are removed', () => {
      const store = makeStore();
      const descendantNode = makeNode('1_1_1', { path: ['1', '1_1'] });
      const ancestorNode = makeNode('1_1', {
        fileSize: 3,
        path: ['1'],
        totalResources: 3,
      });
      addNodeForTransfer(store, descendantNode);
      // adding ancestorNode makes descendantNode redundant
      addNodeForTransfer(store, ancestorNode);
      assert.deepEqual(includeList(store), [ancestorNode]);
      assert.deepEqual(omitList(store), []);
      // files/resources are not double counted
      assert.deepEqual(nodeCounts(store), {
        files: 3,
        resources: 3,
      });
    });

    it('adding root of the content tree makes all descendants redundant', () => {
      const store = makeStore();
      const node_0 = makeNode('1', {
        fileSize: 100,
        path: [],
        totalResources: 100,
      });
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      const node_2 = makeNode('1_2_1', { path: ['1', '1_2'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      addNodeForTransfer(store, node_0);
      assert.deepEqual(includeList(store), [node_0]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 100,
        resources: 100,
      });
    });

    it('re-adding a node in "omit" removes it from that list', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1', {
        fileSize: 5,
        path: ['1'],
        totalResources: 5,
      });
      const node_2 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      removeNodeForTransfer(store, node_2);
      // removing the parent node first, implicitly deselecting node_2
      removeNodeForTransfer(store, node_1);
      assert.deepEqual(includeList(store), []);
      assert.deepEqual(omitList(store), [node_2]);
      // adding node_2 back
      addNodeForTransfer(store, node_2);
      assert.deepEqual(includeList(store), [node_2]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });
  });

  describe('removeNodeForTransfer action', () => {
    it('removing a single node', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1_1', { path: ['1', '1_1'] });
      addNodeForTransfer(store, node_1);
      assert.deepEqual(includeList(store), [node_1]);
      removeNodeForTransfer(store, node_1);
      assert.deepEqual(includeList(store), []);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 0,
        resources: 0,
      });
    });

    it('removing a node that is a child of an included node', () => {
      const store = makeStore();
      const ancestorNode = makeNode('1_1', {
        path: ['1'],
        totalResources: 50,
        fileSize: 50,
      });
      const descendantNode = makeNode('1_1_1', {
        path: ['1', '1_1'],
        totalResources: 20,
        fileSize: 20,
      });
      addNodeForTransfer(store, ancestorNode);
      removeNodeForTransfer(store, descendantNode);
      assert.deepEqual(includeList(store), [ancestorNode]);
      assert.deepEqual(omitList(store), [descendantNode]);
      assert.deepEqual(nodeCounts(store), {
        files: 30,
        resources: 30,
      });
    });

    it('removing a sibling is same as removing single node', () => {
      const store = makeStore();
      const node_1 = makeNode('1_1', { path: ['1'] });
      const node_2 = makeNode('1_2', { path: ['1'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      removeNodeForTransfer(store, node_2);
      assert.deepEqual(includeList(store), [node_1]);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 1,
        resources: 1,
      });
    });

    it('removing root of content tree when some children are selected', () => {
      const store = makeStore();
      const node_0 = makeNode('1');
      const node_1 = makeNode('1_1', { path: ['1'] });
      const node_2 = makeNode('1_2', { path: ['1'] });
      addNodeForTransfer(store, node_1);
      addNodeForTransfer(store, node_2);
      // in UI, user will toggle the channel checkbox once, selecting all of it
      addNodeForTransfer(store, node_0);
      // then click it again to deselect...
      removeNodeForTransfer(store, node_0);
      assert.deepEqual(includeList(store), []);
      assert.deepEqual(omitList(store), []);
      assert.deepEqual(nodeCounts(store), {
        files: 0,
        resources: 0,
      });
    });
  });
});

describe('goToTopic action', () => {
  const cngPayload = contentNodeGranularPayload();

  beforeEach(() => {
    ContentNodeGranularResource.__getModelFetchReturns(cngPayload);
  })

  it('updates the current node in wizardState.treeView', () => {
    const store = makeStore();
    return goToTopic(store, { topic: { id: 'topic_1', title: 'Topic One' } })
      .then(() => {
        assert.deepEqual(store.state.pageState.wizardState.treeView.currentNode, cngPayload);
      });
  });

  it('updates the breadcrumbs and path in wizardState', () => {
    const store = makeStore();
    return goToTopic(store, { topic: { id: 'topic_1', title: 'Topic One' } })
      .then(() => {
        return goToTopic(store, { topic: { id: 'topic_2', title: 'Topic Two' } })
      })
      .then(() => {
        assert.deepEqual(store.state.pageState.wizardState.treeView.breadcrumbs, [
          { id: 'topic_1', title: 'Topic One' },
          { id: 'topic_2', title: 'Topic Two' },
        ]);
        assert.deepEqual(store.state.pageState.wizardState.path, ['topic_1', 'topic_2']);
      });
  });

  it('handles errors from ContentNodeGranular API', () => {
    const store = makeStore();
    ContentNodeGranularResource.__getModelFetchReturns({}, true);
    return goToTopic(store, { topic: { id: 'topic_1', title: 'Topic One' } })
      .then(() => {
        assert.equal(store.state.pageState.wizardState.status, 'TREEVIEW_LOADING_ERROR');
      });
  });
});
