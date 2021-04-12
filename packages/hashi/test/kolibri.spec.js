// import flatMap from 'lodash/flatMap';
import Mediator from '../src/mediator';
import Kolibri from '../src/kolibri';

describe('the kolibri hashi shim', () => {
  let kolibri;
  let mediator;

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

  describe('getContentById method', () => {
    let response, client;
    beforeEach(function() {
      response = { data: [{ testing: 'testing' }] };
      client = jest.fn().mockResolvedValue(response);
      kolibri.shim.client = client;
    });
    it('should be called once', () => {
      kolibri.shim.getContentById().then(() => {
        expect(client).toHaveBeenCalledTimes(1);
      });
    });
    it('should return a promise that resolves to a ContentNode object', () => {
      expect(kolibri.shim.getContentById()).toBeInstanceOf(Promise);
      kolibri.shim.getContentById().then(() => {
        expect(client).toBeInstanceOf(Object);
      });
    });
  });

  describe('getContentByFilter method', () => {
    let response, client;
    beforeEach(function() {
      response = [{ 1: [{ node: 'abc' }] }, { 2: [{ node: '123' }] }];
      client = jest.fn().mockResolvedValue(response);
      kolibri.shim.client = client;
    });
    it('should be called once', () => {
      kolibri.shim.getContentByFilter().then(() => {
        expect(client).toHaveBeenCalledTimes(1);
      });
    });
    it('should return a promise that resolves to an array of metadata objects', () => {
      expect(kolibri.shim.getContentByFilter()).toBeInstanceOf(Promise);
      kolibri.shim.getContentByFilter().then(() => {
        expect(client).toBeInstanceOf(Array);
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
    let response, client;
    beforeEach(function() {
      response = { node_id: 'abc', context: { test: 'test' } };
      client = jest.fn().mockResolvedValue(response);
      kolibri.shim.client = client;
    });
    it('should be called once', () => {
      kolibri.shim.getContext().then(() => {
        expect(client).toHaveBeenCalledTimes(1);
      });
    });
    it('should return a promise that resolves to a context Object', () => {
      expect(kolibri.shim.getContext()).toBeInstanceOf(Promise);
      kolibri.shim.getContext().then(() => {
        expect(client).toBeInstanceOf(Object);
      });
    });
  });
});
