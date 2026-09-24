import Mediator from 'kolibri-sandbox/mediator';
import { events, nameSpace, MessageStatuses } from 'kolibri-sandbox/base';
import KolibriShim from './KolibriShim';

describe('the kolibri shim', () => {
  let kolibri, mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    kolibri = new KolibriShim(mediator);
    kolibri.__setShimInterface();
  });
  afterEach(() => {
    mediator.destroy();
  });
  describe('initialize method', () => {
    it('should set a "kolibri" property on object', () => {
      const obj = {};
      kolibri.initialize(obj);
      expect(obj.kolibri).toEqual(kolibri.shim);
    });
  });

  describe('request events', () => {
    // The wire names CustomContentRenderer listens for. A method sending any other
    // name gets no reply, and its promise never settles.
    const options = { parent: 'self' };
    it.each([
      ['getContentByFilter', [options], 'collectionrequested', { options }],
      ['getContentById', ['abc'], 'modelrequested', { id: 'abc' }],
      ['getContext', [], 'context', {}],
      ['themeRenderer', [{ appBar: {} }], 'themechanged', { appBar: {} }],
      ['getContentPage', [options], 'collectionpagerequested', { options }],
      ['searchContent', [options], 'searchresultrequested', { options }],
      ['navigateTo', ['abc', { a: 1 }], 'navigateTo', { nodeId: 'abc', context: { a: 1 } }],
      ['updateContext', [{ a: 1 }], 'context', { context: { a: 1 } }],
      ['getVersion', [], 'kolibriversionrequested', {}],
      ['getChannelMetadata', [], 'channelmetadatarequested', {}],
      ['getChannelFilterOptions', [], 'channelfilteroptionsrequested', {}],
      ['getRandomNodes', [options], 'randomcollectionrequested', { options }],
    ])('%s sends the event CustomContentRenderer answers', async (method, args, event, data) => {
      const reply = { answered: method };
      const sent = jest.spyOn(mediator, 'sendMessageAwaitReply').mockResolvedValue(reply);

      await expect(kolibri.shim[method](...args)).resolves.toBe(reply);

      expect(sent).toHaveBeenCalledWith({ event, data, nameSpace });
    });
  });

  describe('replies', () => {
    it('should settle a request when its reply arrives', async () => {
      const sent = jest.spyOn(mediator, 'sendMessage').mockImplementation();
      const settled = jest.fn();
      kolibri.shim.getContentById('abc123').then(settled, settled);

      mediator.handleMessage({
        data: {
          nameSpace,
          event: events.DATARETURNED,
          data: {
            message_id: sent.mock.calls[0][0].data.message_id,
            type: 'response',
            status: MessageStatuses.SUCCESS,
            data: {},
          },
        },
      });
      await Promise.resolve();

      expect(settled).toHaveBeenCalled();
    });
  });
});
