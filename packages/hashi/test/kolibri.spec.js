// import flatMap from 'lodash/flatMap';
import Mediator from '../src/mediator';
import Kolibri from '../src/kolibri';

describe('the kolibri hashi shim', () => {
  let kolibri;
  let mediator;
  let response;
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
    beforeEach(function() {
      response = { node: { id: 'abc123' } };
      kolibri.shim.getContentById = jest.fn().mockResolvedValue(response);
    });
    it('should be called once', () => {
      kolibri.shim.getContentById().then(() => {
        expect(kolibri.shim.getContentById).toHaveBeenCalledTimes(1);
      });
    });
    it('should return a promise that resolves to a ContentNode object', () => {
      return kolibri.shim.getContentById().then(data => {
        expect(data).toEqual(response);
      });
    });
  });

  describe('getContentByFilter method', () => {
    beforeEach(function() {
      response = [{ 1: [{ node: 'abc' }] }, { 2: [{ node: '123' }] }];
      kolibri.shim.getContentByFilter = jest.fn().mockResolvedValue(response);
    });
    it('should be called once', () => {
      kolibri.shim.getContentByFilter().then(() => {
        expect(kolibri.shim.getContentByFilter).toHaveBeenCalledTimes(1);
      });
    });
    it('should return a promise that resolves to an array of metadata objects', () => {
      return kolibri.shim.getContentByFilter().then(data => {
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
    beforeEach(function() {
      response = { node_id: 'abc', context: { test: 'test' } };
      kolibri.shim.getContext = jest.fn().mockResolvedValue(response);
    });
    it('should be called once', () => {
      kolibri.shim.getContext().then(() => {
        expect(kolibri.shim.getContext).toHaveBeenCalledTimes(1);
      });
    });
    it('should return a promise that resolves to a context Object', () => {
      kolibri.shim.getContext().then(data => {
        expect(data).toEqual(response);
      });
    });
  });
});
