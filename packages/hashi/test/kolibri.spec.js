import Mediator from '../src/mediator';
import Kolibri from '../src/kolibri';

describe('the kolibri hashi shim', () => {
  let kolibri, mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    kolibri = new Kolibri(mediator);
    kolibri.__setShimInterface();
  });
  describe('__setShimInterface method', () => {
    it('should set kolibri shim property', () => {
      expect(kolibri.shim).not.toBeUndefined();
    });
  });
  describe('iframeInitialize method', () => {
    it('should set a "kolibri" property on object', () => {
      const obj = {};
      kolibri.iframeInitialize(obj);
      expect(obj.kolibri).toEqual(kolibri.shim);
    });
  });

  // methods
  let response, id, mockMessage, mockMediatorPromise;

  describe('getContentById method', () => {
    id = 'abc123';
    mockMessage = {
      data: { dataType: 'Model', id: 'abc123' },
      event: 'datarequested',
      nameSpace: 'hashi',
    };
    response = { node: { id: 'abc123' } };
    beforeEach(function () {
      mockMediatorPromise = jest
        .spyOn(kolibri.mediator, 'sendMessageAwaitReply')
        .mockResolvedValue(response);
    });
    it('should be called once', () => {
      kolibri.shim.getContentById(id);
      expect(mockMediatorPromise).toHaveBeenCalled();
    });
    it('should be called with the correct event, data, and namespace', () => {
      kolibri.shim.getContentById(id);
      expect(mockMediatorPromise).toHaveBeenCalledWith(mockMessage);
    });
    it('should return a promise that resolves to a ContentNode object', () => {
      return kolibri.shim.getContentById(id).then(data => {
        expect(data).toEqual(response);
      });
    });
  });

  describe('getContentByFilter method', () => {
    const options = { page: 1, pageSize: 50, parent: 'self' };
    response = { page: 1, pageSize: 50, results: [{ id: 'abc123' }, { id: 'def456' }] };
    beforeEach(function () {
      mockMessage = {
        data: { dataType: 'Collection', options: options },
        event: 'datarequested',
        nameSpace: 'hashi',
      };
      mockMediatorPromise = jest
        .spyOn(kolibri.mediator, 'sendMessageAwaitReply')
        .mockResolvedValue(response);
    });
    it('should be called once', () => {
      kolibri.shim.getContentByFilter(options);
      expect(mockMediatorPromise).toHaveBeenCalled();
    });
    it('should be called with the correct event, data, and namespace', () => {
      kolibri.shim.getContentByFilter(options);
      expect(mockMediatorPromise).toHaveBeenCalledWith(mockMessage);
    });
    it('should return a promise that resolves to pagination object that contains an array of metadata objects', () => {
      return kolibri.shim.getContentByFilter().then(data => {
        expect(data).toEqual(response);
      });
    });
  });

  describe('getContentById method', () => {
    response = { node: { id: 'abc123' } };
    id = 'abc123';
    beforeEach(function () {
      mockMessage = {
        data: { dataType: 'Model', id: 'abc123' },
        event: 'datarequested',
        nameSpace: 'hashi',
      };
      mockMediatorPromise = jest
        .spyOn(kolibri.mediator, 'sendMessageAwaitReply')
        .mockResolvedValue(response);
    });
    it('should return a promise that resolves to a ContentNode object', () => {
      return kolibri.shim.getContentById(id).then(data => {
        expect(data).toEqual(response);
      });
    });
  });

  describe('navigateTo method', () => {
    it('should return a promise', () => {
      expect(kolibri.shim.navigateTo()).toBeInstanceOf(Promise);
    });
  });

  describe('updateContext method', () => {
    it('should return a promise', () => {
      expect(kolibri.shim.updateContext()).toBeInstanceOf(Promise);
    });
  });

  describe('getContext method', () => {
    response = { node_id: 'abc', context: { test: 'test' } };
    beforeEach(function () {
      mockMessage = {
        data: {},
        event: 'context',
        nameSpace: 'hashi',
      };
      mockMediatorPromise = jest
        .spyOn(kolibri.mediator, 'sendMessageAwaitReply')
        .mockResolvedValue(response);
    });
    it('should be called once', () => {
      kolibri.shim.getContext();
      expect(mockMediatorPromise).toHaveBeenCalled();
    });
    it('should be called with the correct event, data, and namespace', () => {
      kolibri.shim.getContext();
      expect(mockMediatorPromise).toHaveBeenCalledWith(mockMessage);
    });
    it('should return a promise that resolves to pagination object that contains an array of metadata objects', () => {
      return kolibri.shim.getContext().then(data => {
        expect(data).toEqual(response);
      });
    });
  });

  xdescribe('version getter', () => {
    it('returns the correct version number', () => {
      // "testversion" is set in jest.conf. In production, this is injected by webpack.
      expect(kolibri.shim.version).toEqual('testversion');
    });
  });

  describe('themeRenderer method', () => {
    it('sets the shim.theme object within the Shim class', async () => {
      const sendMessageAwaitReplySpy = jest
        .spyOn(kolibri.mediator, 'sendMessageAwaitReply')
        .mockResolvedValue();
      await kolibri.shim.themeRenderer({
        appBarColor: 'pink',
        textColor: 'blue',
      });
      expect(sendMessageAwaitReplySpy).toHaveBeenCalledWith({
        event: 'themechanged',
        nameSpace: 'hashi',
        data: {
          appBarColor: 'pink',
          textColor: 'blue',
        },
      });
    });
  });

  describe('searchContent method', () => {
    beforeEach(function () {
      mockMessage = {
        data: {},
        event: 'context',
        nameSpace: 'hashi',
      };
      mockMediatorPromise = jest
        .spyOn(kolibri.mediator, 'sendMessageAwaitReply')
        .mockResolvedValue(response);
    });

    afterEach(() => {
      mockMediatorPromise.mockReset();
    });

    it('should be called with the correct event, data, and namespace', async () => {
      const options = {
        keyword: 'sewing',
        under: 'self',
        page: 1,
        pageSize: 25,
      };
      await kolibri.shim.searchContent(options);
      expect(mockMediatorPromise).toHaveBeenCalledWith({
        event: 'datarequested',
        data: {
          options,
          dataType: 'SearchResult',
        },
        nameSpace: 'hashi',
      });
    });
  });
});
