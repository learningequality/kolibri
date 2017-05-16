/* eslint-env mocha */
const sinon = require('sinon');
const actions = require('../../src/state/manageContentActions');
const { FileResource, ChannelResource } = require('kolibri').resources;

const makeFetachable = (pl) => ({ fetch: () => Promise.resolve(pl) });

const fakeFiles1 = [{ id: 'file_1' }, { id: 'file_2' }, { id: 'file_3' }];
// const fakeFiles2 = [{ id: 'file_1' }, { id: 'file_2' }];

describe('content import/export actions', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: {
      core: {
        pageId: '',
        channels: {
          list: [{ id: 'channel_1' }, { id: 'channel_2' }],
        }
      },
      pageState: {},
    },
  };

  const dispatchSpy = storeMock.dispatch;

  afterEach(() => {
    FileResource.__resetMocks();
    dispatchSpy.reset();
    storeMock.state.pageState = {};
  });

  describe('updateChannelContentInfo', () => {
    it('updates store with channel content info', () => {
      FileResource.getCollection.withArgs({ channel_id: 'channel_1' }).returns(makeFetachable(fakeFiles1));
      return actions.updateChannelContentInfo(storeMock, 'channel_1')._promise
      .then(() => {
        sinon.assert.calledWith(dispatchSpy, 'CONTENT_MGMT_UPDATE_CHANNEL_INFO', {
          channelId: 'channel_1',
          files: fakeFiles1,
        });
      });
    });
  });

  describe('deleteChannel action', () => {
    it('when there are no problems', () => {
      const deleteStub = ChannelResource.__getModelDeleteReturns('delete ok');
      return actions.deleteChannel(storeMock, 'channel_1')
      .then(() => {
        sinon.assert.called(deleteStub);
        sinon.assert.calledWith(ChannelResource.getModel, 'channel_1');
        // it seems that this action does not need to mutate anything. at next poll,
        // the global list of channels should have this channel removed
        sinon.assert.calledWith(dispatchSpy, 'CORE_REMOVE_CHANNEL', 'channel_1');
      });
    });
  });
});
