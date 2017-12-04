/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import { transitionWizardPage } from '../../state/actions/contentWizardActions';
import { availableChannels, wizardState } from '../../state/getters';
import mutations from '../../state/mutations';
import * as selectContentActions from '../../state/actions/selectContentActions';
import { TaskResource, RemoteChannelResource } from 'kolibri.resources';
import { mockResource } from 'testUtils'; // eslint-disable-line
import { importExportWizardState } from '../../state/wizardState';

mockResource(RemoteChannelResource);

const installedChannels = [
  { id: 'installed_channel_1', name: 'Installed Channel One' },
  { id: 'installed_channel_2', name: 'Installed Channel Two' },
];

const driveList = [
  {
    id: 'drive_1',
    name: 'Drive Nummer Eins',
    metadata: {
      channels: [
        { id: 'drive_1_channel_1', name: 'Drive 1 Channel One' },
        { id: 'drive_1_channel_2', name: 'Drive 1 Channel Two' },
      ],
    },
  },
  {
    id: 'drive_2',
    name: 'Drive Nummer Zwei',
    metadata: {
      channels: [
        { id: 'drive_2_channel_1', name: 'Drive 2 Channel One' },
        { id: 'drive_2_channel_2', name: 'Drive 2 Channel Two' },
      ],
    },
  },
];

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        channelList: [...installedChannels],
        wizardState: {
          ...importExportWizardState(),
          driveList: [...driveList],
        },
      },
    },
    mutations,
  });
}

describe('transitionWizardPage action', () => {
  // Tests import/export workflow from ManageContentPage to the SelectContentPage
  // Covers integrations with showAvailableChannelsPage and showSelectContentPage
  let store;
  let showSelectContentPageStub;

  const pageName = () => wizardState(store.state).pageName;
  const transferType = () => wizardState(store.state).transferType;
  const selectedDrive = () => wizardState(store.state).selectedDrive;

  before(() => {
    TaskResource.localDrives = sinon.stub();
  });

  beforeEach(() => {
    store = makeStore();

    showSelectContentPageStub = sinon
      .stub(selectContentActions, 'showSelectContentPage')
      .returns(Promise.resolve());
  });

  afterEach(() => {
    showSelectContentPageStub.restore();
    TaskResource.localDrives.reset();
  });

  it('REMOTEIMPORT flow correctly updates wizardState', () => {
    const publicChannels = [
      { id: 'public_channel_1', name: 'Public Channel One' },
      { id: 'public_channel_2', name: 'Public Channel Two' },
    ];
    // makes call to RemoteChannel API
    let fetchSpy = sinon.stub().returns({
      _promise: Promise.resolve(publicChannels),
    });
    RemoteChannelResource.getCollection.returns({
      fetch: fetchSpy,
    });

    // STEP 1 - click "import" -> SELECT_IMPORT_SOURCE
    transitionWizardPage(store, 'forward', { import: true });
    assert.equal(pageName(), 'SELECT_IMPORT_SOURCE');

    // STEP 2 - choose "internet" from options -> AVAILABLE_CHANNELS
    return transitionWizardPage(store, 'forward', { source: 'network' })
      .then(() => {
        assert.equal(pageName(), 'AVAILABLE_CHANNELS');
        assert.equal(transferType(), 'remoteimport');

        // Calls from inside showAvailableChannelsPage
        sinon.assert.calledOnce(RemoteChannelResource.getCollection);
        sinon.assert.calledOnce(fetchSpy);
        assert.deepEqual(availableChannels(store.state), publicChannels);

        // STEP 3 - pick first channel -> SELECT_CONTENT
        return transitionWizardPage(store, 'forward', {
          channel: {
            id: 'public_channel_1',
          },
        });
      })
      .then(() => {
        sinon.assert.calledOnce(showSelectContentPageStub);
        RemoteChannelResource.__resetMocks();
      });
  });

  it('LOCALIMPORT flow correctly updates wizardState', () => {
    TaskResource.localDrives.returns(
      Promise.resolve({
        entity: [],
      })
    );
    const selectedUsbDrive = driveList[1];
    const channel = {
      ...selectedUsbDrive.metadata.channels[0],
    };

    // STEP 1 - click "import" -> SELECT_IMPORT_SOURCE
    transitionWizardPage(store, 'forward', { import: true });
    assert.equal(pageName(), 'SELECT_IMPORT_SOURCE');

    // STEP 2 - choose "usb drive" from options -> SELECT_DRIVE
    transitionWizardPage(store, 'forward', { source: 'local' });
    assert.equal(pageName(), 'SELECT_DRIVE');
    assert.equal(transferType(), 'localimport');

    // STEP 3 - choose "drive_2" -> AVAILABLE_CHANNELS
    return transitionWizardPage(store, 'forward', { driveId: 'drive_2' })
      .then(() => {
        assert.equal(pageName(), 'AVAILABLE_CHANNELS');
        assert.deepEqual(selectedDrive(), selectedUsbDrive);
        assert.deepEqual(availableChannels(store.state), selectedUsbDrive.metadata.channels);

        // STEP 4 - pick the first channel -> go to "select content" page
        return transitionWizardPage(store, 'forward', { channel });
      })
      .then(() => {
        sinon.assert.calledOnce(showSelectContentPageStub);
      });
  });

  it('LOCALEXPORT flow correctly updates wizardState', () => {
    TaskResource.localDrives.returns(
      Promise.resolve({
        entity: [],
      })
    );
    const channel = {
      ...installedChannels[0],
    };

    // STEP 1 - click "export" -> SELECT_DRIVE
    transitionWizardPage(store, 'forward', { import: false });
    assert.equal(pageName(), 'SELECT_DRIVE');
    assert.equal(transferType(), 'localexport');

    // STEP 2 - choose "drive_1" -> AVAILABLE_CHANNELS
    return transitionWizardPage(store, 'forward', { driveId: 'drive_1' })
      .then(() => {
        assert.equal(pageName(), 'AVAILABLE_CHANNELS');
        assert.deepEqual(availableChannels(store.state), installedChannels);

        // STEP 3 - pick a channel -> SELECT_CONTENT
        return transitionWizardPage(store, 'forward', { channel });
      })
      .then(() => {
        sinon.assert.calledOnce(showSelectContentPageStub);
      });
  });

  it('in all modes, going back from SELECT_CONTENT to AVAILABLE_CHANNELS should reset parts of wizardState', () => {
    // Putting unrealistic data into state to emphasize the generality of this behavior
    const initial = {
      currentTopicNode: {
        id: 'currentTopicNode',
      },
      nodesForTransfer: {
        included: [1, 2, 3],
        omitted: [4, 5, 6],
      },
      pageName: 'SELECT_CONTENT',
      availableSpace: 123123123,
      availableChannels: ['a', 'b', 'c'],
      driveList: ['c', 'd', 'e'],
      selectedDrive: {
        foo: 'bar',
      },
      transferType: 'intergalatic',
      path: [{ bar: 'foo', baz: 'buzz' }],
      status: 'awesome',
      pathCache: { a: { b: 1 } },
      transferredChannel: {
        id: 'channelios',
      },
    };
    const expected = {
      ...initial,
      currentTopicNode: {},
      nodesForTransfer: {
        included: [],
        omitted: [],
      },
      pageName: 'AVAILABLE_CHANNELS',
      path: [],
      status: '',
      pathCache: {},
      transferredChannel: {},
    };
    store.state.pageState.wizardState = { ...initial };
    return transitionWizardPage(store, 'backward').then(() => {
      assert.deepEqual(wizardState(store.state), expected);
    });
  });
});
