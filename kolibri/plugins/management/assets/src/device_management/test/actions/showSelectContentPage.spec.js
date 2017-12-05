/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import router from 'kolibri.coreVue.router';
import { showSelectContentPage } from '../../state/actions/selectContentActions';
import mutations from '../../state/mutations';
import { wizardState } from '../../state/getters';
import { ChannelResource, ContentNodeGranularResource, TaskResource } from 'kolibri.resources';
import { mockResource } from 'testUtils'; // eslint-disable-line
import { importExportWizardState } from '../../state/wizardState';
import { defaultChannel } from '../utils/data';

mockResource(ChannelResource);
mockResource(ContentNodeGranularResource);
mockResource(TaskResource);

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        taskList: [],
        channelList: [{ id: 'channel_1', name: 'Installed Channel', root: 'channel_1_root' }],
        wizardState: {
          ...importExportWizardState(),
          pageName: 'SELECT_CONTENT',
          transferredChannel: { ...defaultChannel },
        },
      },
    },
    mutations: {
      ...mutations,
      addTask(state, task) {
        state.pageState.taskList.push(task);
      },
    },
  });
}

// Have store suddenly add a Task to the store so the task waiting step
// resolves successfully
function hackStoreWatcher(store) {
  setTimeout(() => {
    store.dispatch('addTask', { id: 'task_1', status: 'COMPLETED' });
  }, 1);
}

describe('showSelectContentPage action', () => {
  let store;

  before(() => {
    // Add mock methods not in generic mock Resource
    TaskResource.startRemoteChannelImport = sinon.stub();
    TaskResource.startDiskChannelImport = sinon.stub();
  });

  beforeEach(() => {
    store = makeStore();
    hackStoreWatcher(store);
    const taskEntity = { entity: { id: 'task_1' } };
    TaskResource.cancelTask = sinon.stub().returns(Promise.resolve());
    TaskResource.startDiskChannelImport.returns(Promise.resolve(taskEntity));
    TaskResource.startRemoteChannelImport.returns(Promise.resolve(taskEntity));
    ChannelResource.getModel.returns({
      fetch: () => ({
        _promise: Promise.resolve({
          name: 'Channel One',
          root: 'channel_1_root',
        }),
      }),
    });
  });

  afterEach(() => {
    ChannelResource.__resetMocks();
    ContentNodeGranularResource.__resetMocks();
    TaskResource.__resetMocks();
    TaskResource.startRemoteChannelImport.reset();
    TaskResource.startDiskChannelImport.reset();
    TaskResource.cancelTask.reset();
  });

  function setUpStateForTransferType(transferType) {
    store.state.pageState.wizardState.transferType = transferType;
    store.state.pageState.wizardState.selectedDrive = {
      id: `${transferType}_specs_drive`,
    };
    store.state.pageState.wizardState.transferredChannel = {
      id: `${transferType}_brand_new_channel`,
    };
  }

  function useInstalledChannel() {
    store.state.pageState.wizardState.transferredChannel = { id: 'channel_1' };
  }

  // Tests for common behavior
  function testNoChannelsAreImported(store, options) {
    return showSelectContentPage(store, options).then(() => {
      sinon.assert.notCalled(TaskResource.startDiskChannelImport);
      sinon.assert.notCalled(TaskResource.startRemoteChannelImport);
    });
  }

  let pushStub;

  before(() => {
    pushStub = sinon.stub(router, 'push');
  });

  function testUpdateTopicUrlIsCorrect(store, { pk, title }) {
    // To test the end of this action, we spy router.push. Production code for
    // router-based tree view updater relies on the kolibri.store singleton, while these tests
    // stub store with fresh Vuex.Store instance.
    pushStub.restore();
    return showSelectContentPage(store).then(() => {
      sinon.assert.calledWithMatch(pushStub, {
        name: 'GOTO_TOPIC_TREEVIEW',
        params: { node: { pk, title } },
        query: { pk },
      });
    });
  }

  describe('during LOCALIMPORT only', () => {
    beforeEach(() => {
      setUpStateForTransferType('localimport');
    });

    it('if channel already installed, "startdiskchannelimport" is not called', () => {
      useInstalledChannel();
      return testNoChannelsAreImported(store);
    });

    it('after metadata is downloaded, user is redirected to correct wizard URL', () => {
      return testUpdateTopicUrlIsCorrect(store, {
        pk: 'channel_1_root',
        title: 'Installed Channel',
      });
    });

    it('if channel is *not* on device, then "startdiskchannelimport" is called', () => {
      return showSelectContentPage(store).then(() => {
        sinon.assert.calledWith(TaskResource.startDiskChannelImport, {
          channel_id: 'localimport_brand_new_channel',
          drive_id: 'localimport_specs_drive',
        });
        sinon.assert.notCalled(TaskResource.startRemoteChannelImport);
      });
    });

    it('errors from startDiskChannelImport are handled', () => {
      TaskResource.startDiskChannelImport.returns(Promise.reject());
      return showSelectContentPage(store).then(() => {
        assert.equal(wizardState(store.state).status, 'CONTENT_DB_LOADING_ERROR');
      });
    });
  });

  describe('during REMOTEIMPORT only', () => {
    beforeEach(() => {
      setUpStateForTransferType('remoteimport');
    });

    it('if channel is already installed, then "startremotechannelimport" is *not* called', () => {
      useInstalledChannel();
      return testNoChannelsAreImported(store);
    });

    it('after metadata is downloaded, user is redirected to correct wizard URL', () => {
      return testUpdateTopicUrlIsCorrect(store, {
        pk: 'channel_1_root',
        title: 'Installed Channel',
      });
    });

    it('if channel is *not* on device, then "startremotechannelimport" is called', () => {
      return showSelectContentPage(store).then(() => {
        sinon.assert.calledWith(TaskResource.startRemoteChannelImport, {
          channel_id: 'remoteimport_brand_new_channel',
        });
        sinon.assert.notCalled(TaskResource.startDiskChannelImport);
      });
    });

    it('errors from startRemoteChannelImport are handled', () => {
      TaskResource.startRemoteChannelImport.returns(Promise.reject());
      return showSelectContentPage(store).then(() => {
        assert.equal(wizardState(store.state).status, 'CONTENT_DB_LOADING_ERROR');
      });
    });
  });

  describe('during LOCALEXPORT only', () => {
    beforeEach(() => {
      setUpStateForTransferType('localexport');
      // In principle, only channels already on the device can be exported
      useInstalledChannel();
    });

    it('"startdiskchannelimport" and "startremotechannelimport" are not called', () => {
      return testNoChannelsAreImported(store);
    });

    it('after metadata is downloaded, user is redirected to correct wizard URL', () => {
      return testUpdateTopicUrlIsCorrect(store, {
        pk: 'channel_1_root',
        title: 'Installed Channel',
      });
    });
  });

  // Not tested:
  // * When channel import Tasks fail
});
