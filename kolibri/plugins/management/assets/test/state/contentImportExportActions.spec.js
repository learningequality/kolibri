/* eslint-env mocha */
const sinon = require('sinon');
const actions = require('../../src/state/contentImportExportActions');
const { FileResource } = require('kolibri').resources;

const makeFetachable = (pl) => ({ fetch: () => Promise.resolve(pl) });

const fakeFiles1 = [{ id: 'file_1' }, { id: 'file_2' }, { id: 'file_3' }];
const fakeFiles2 = [{ id: 'file_1' }, { id: 'file_2' }];

describe.only('content import/export actions', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageId: '' } },
  };

  const dispatchSpy = storeMock.dispatch;

  afterEach(() => {
    FileResource.__resetMocks();
    dispatchSpy.reset();
  });

  describe('updateChannelContentInfo', () => {
    it('updates store with channel content info', () => {
      FileResource.getCollection.withArgs({ channel_id: 'channel_1' }).returns(makeFetachable(fakeFiles1));
      FileResource.getCollection.withArgs({ channel_id: 'channel_2' }).returns(makeFetachable(fakeFiles2));
      return actions.updateChannelContentInfo(storeMock)
      .then(() => {
        // payload is files list partitioned by channel id. the computations
        // will be done in the mutation
        sinon.assert.calledWith(dispatchSpy, 'CONTENT_IO_UPDATE_CHANNEL_INFO', {
          channel_1: fakeFiles1,
          channel_2: fakeFiles2,
        });
      });
    });
  });
});
