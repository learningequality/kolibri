/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import { startImportWizard, startExportWizard, transitionWizardPage } from '../../state/actions/contentWizardActions';
import mutations from '../../state/mutations';
import * as contentTransferActions from '../../state/actions/contentTransferActions';
import { TaskResource } from 'kolibri.resources';


function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        wizardState: {},
      },
    },
    mutations,
  });
}

describe('showAvailableChannelsPage action', () => {
  it('when importing from the internet, makes the correct request for public Channels', () => {
    // checking wizardState.availableChannels
  });

  it('when importing from local drive, gets Channels from drive metadata', () => {

  });

  it('when exporting to a local drive makes the correct request for Channels', () => {

  });
});

describe('transitionWizardPage action', () => {
  let store;
  let selectContentStub;

  const pageName = () => store.state.pageState.wizardState.page;
  const meta = () => store.state.pageState.wizardState.meta;

  function testShowSelectContentCall(transferMeta, channel) {
    // test handoff of data to showSelectContentPage
    sinon.assert.calledOnce(selectContentStub);
    sinon.assert.calledWithMatch(selectContentStub, sinon.match.any, {
      ...transferMeta,
      channel,
    });
  }

  beforeEach(() => {
    selectContentStub = sinon.stub(contentTransferActions, 'showSelectContentPage')
      .returns(Promise.resolve());
  });

  afterEach(() => {
    selectContentStub.restore();
  });

  it('remote/network import flow correctly updates wizardState', () => {
    store = makeStore();
    const transferMeta = {
      source: {
        type: 'NETWORK_SOURCE',
        baseUrl: '',
      },
      transferType: 'remoteimport',
    };
    // flow will be the same even if channel is unlisted with a token
    const channel = {
      id: 'channel_1',
      name: 'Channel Numero Uno',
      onDevice: false,
      token: '',
    };

    // click "import" -> open "choose source" modal
    startImportWizard(store);
    assert.equal(pageName(), 'CHOOSE_IMPORT_SOURCE');

    // choose "internet" from options -> go to "available channels" page
    transitionWizardPage(store, 'forward', { source: 'network' });
    assert.equal(pageName(), 'NETWORK_AVAILABLE_CHANNELS');
    assert.deepEqual(meta(), transferMeta);

    // pick a channel -> go to "select content" page
    return transitionWizardPage(store, 'forward', { channel })
      .then(() => {
        testShowSelectContentCall(transferMeta, channel);
      });
  });

  it('local import flow correctly updates wizardState', () => {
    store = makeStore();
    const transferMeta = {
      source: {
        type: 'LOCAL_DRIVE',
        driveId: 'drive_1',
        driveName: 'Drive Nummer Eins',
      },
      transferType: 'localimport',
    };
    const channel = {
      id: 'channel_2',
      name: 'Channel Nummer Zwei',
      onDevice: false,
    };

    // click "import" -> open "choose source" modal
    startImportWizard(store);

    // choose "usb drive" from options -> go to "choose drive" modal
    transitionWizardPage(store, 'forward', { source: 'local' });
    store.state.pageState.wizardState.driveList = [{
      id: 'drive_1',
      name: 'Drive Nummer Eins',
    }];
    assert.equal(pageName(), 'IMPORT_LOCAL');

    // choose a particular usb drive -> go to "available channels" page
    transitionWizardPage(store, 'forward', { driveId: 'drive_1' });
    assert.equal(pageName(), 'NETWORK_AVAILABLE_CHANNELS');
    assert.deepEqual(meta(), transferMeta);

    // pick a channel -> go to "select content" page
    return transitionWizardPage(store, 'forward', { channel })
      .then(() => {
        testShowSelectContentCall(transferMeta, channel);
      })
  });

  it('local export flow correctly updates wizardState', () => {
    const localDrivesStub = sinon.stub(TaskResource, 'localDrives').returns(Promise.resolve({
      entity: [],
    }));
    store = makeStore();
    const channel = {
      id: 'channel_3',
      name: 'Channel Numero Tres',
      onDevice: true,
    };
    const transferMeta = {
      source: {},
      transferType: 'localexport',
    }

    // click "export" -> open "choose drive" modal
    startExportWizard(store);
    assert.equal(pageName(), 'EXPORT');

    // choose a particular usb drive -> go to "available channels" page
    transitionWizardPage(store, 'forward', {});
    assert.equal(pageName(), 'NETWORK_AVAILABLE_CHANNELS'); // TODO rename to be more generic
    assert.deepEqual(meta(), transferMeta);

    // pick a channel -> go to "select content" page
    return transitionWizardPage(store, 'forward', { channel })
      .then(() => {
        testShowSelectContentCall(transferMeta, channel);
        localDrivesStub.restore();
      });
  });
})
